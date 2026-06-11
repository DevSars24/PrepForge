import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { PDFDocument } from "pdf-lib";
import { PrepForgeError } from "@/lib/debug";

const SARVAM_BASE_URL = "https://api.sarvam.ai/doc-digitization/job/v1";

/**
 * Combines an array of image buffers (PNG or JPEG) into a single PDF buffer.
 */
export async function compileImagesToPdf(
  images: { buffer: Buffer; mimeType: string }[]
): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.create();
    for (const img of images) {
      let pdfImg;
      if (img.mimeType === "image/png") {
        pdfImg = await pdfDoc.embedPng(img.buffer);
      } else if (img.mimeType === "image/jpeg" || img.mimeType === "image/jpg") {
        pdfImg = await pdfDoc.embedJpg(img.buffer);
      } else {
        console.warn(`[Sarvam] Skipping unsupported image type: ${img.mimeType}`);
        continue;
      }

      const page = pdfDoc.addPage([pdfImg.width, pdfImg.height]);
      page.drawImage(pdfImg, {
        x: 0,
        y: 0,
        width: pdfImg.width,
        height: pdfImg.height,
      });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    throw new PrepForgeError({
      kind: "pdf_scan_error",
      component: "compileImagesToPdf",
      message: `Failed to compile images to PDF: ${error instanceof Error ? error.message : String(error)}`,
      cause: error,
    });
  }
}

/**
 * Runs the asynchronous Sarvam Digitization workflow to transcribe a PDF/Image document.
 */
export async function digitizeDocument(
  fileBuffer: Buffer,
  fileName = "document.pdf",
  mimeType = "application/pdf"
): Promise<string> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    throw new PrepForgeError({
      kind: "gemini_error",
      component: "digitizeDocument",
      message: "SARVAM_API_KEY is not configured",
      statusCode: 503,
    });
  }

  try {
    // 1. Create Digitization Job
    console.log("[Sarvam] Creating document digitization job...");
    const createRes = await fetch(SARVAM_BASE_URL, {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        job_parameters: {
          language: "en-IN",
          output_format: "md",
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Create job failed (${createRes.status}): ${errText}`);
    }

    const createData = (await createRes.json()) as any;
    const jobId = createData.job_id;
    if (!jobId) {
      throw new Error(`No job_id returned. Response: ${JSON.stringify(createData)}`);
    }
    console.log(`[Sarvam] Created job ID: ${jobId}`);

    // 2. Get Upload Presigned URLs
    console.log("[Sarvam] Requesting upload URL...");
    const uploadRes = await fetch(`${SARVAM_BASE_URL}/upload-files`, {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        job_id: jobId,
        files: [fileName],
      }),
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Request upload URL failed (${uploadRes.status}): ${errText}`);
    }

    const uploadData = (await uploadRes.json()) as any;
    const uploadUrlObject = uploadData.upload_urls?.[fileName];
    const uploadUrl = uploadUrlObject?.file_url;
    if (!uploadUrl) {
      throw new Error(`Upload URL not found in response for ${fileName}`);
    }

    // 3. Upload File via PUT to Azure Storage
    console.log(`[Sarvam] Uploading file to Azure Blob storage (size: ${fileBuffer.length} bytes)...`);
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
        "x-ms-blob-type": "BlockBlob",
      },
      body: new Uint8Array(fileBuffer),
    });

    if (!putRes.ok) {
      throw new Error(`Blob upload failed with status ${putRes.status}: ${putRes.statusText}`);
    }
    console.log("[Sarvam] File upload succeeded.");

    // 4. Start Digitization Job
    console.log("[Sarvam] Starting digitization job run...");
    const startRes = await fetch(`${SARVAM_BASE_URL}/${jobId}/start`, {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!startRes.ok) {
      const errText = await startRes.text();
      throw new Error(`Start job failed (${startRes.status}): ${errText}`);
    }
    console.log("[Sarvam] Job started successfully.");

    // 5. Poll Job Status
    console.log("[Sarvam] Polling job status...");
    let attempts = 0;
    let completedStatus: any = null;
    const maxAttempts = 30; // 90 seconds timeout
    
    while (attempts < maxAttempts) {
      attempts++;
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const statusRes = await fetch(`${SARVAM_BASE_URL}/${jobId}/status`, {
        method: "GET",
        headers: {
          "api-subscription-key": apiKey,
        },
      });

      if (!statusRes.ok) {
        console.warn(`[Sarvam] Failed to poll status (attempt ${attempts}): ${statusRes.statusText}`);
        continue;
      }

      const statusData = (await statusRes.json()) as any;
      const state = statusData.job_state;
      console.log(`[Sarvam] Poll attempt ${attempts}: state = ${state}`);

      if (state === "Completed") {
        completedStatus = statusData;
        break;
      } else if (state === "Failed") {
        throw new Error(`Job execution failed on Sarvam side: ${statusData.error_message || "Unknown error"}`);
      }
    }

    if (!completedStatus) {
      throw new Error("Job polling timed out after 90 seconds");
    }

    // Get output file name
    const outputs = completedStatus.job_details?.[0]?.outputs;
    if (!outputs || outputs.length === 0) {
      throw new Error("No output files listed in completed job details");
    }
    const outFileName = outputs[0]?.file_name || "document.zip";

    // 6. Request Download Presigned URL
    console.log("[Sarvam] Requesting download URL...");
    const downloadRes = await fetch(`${SARVAM_BASE_URL}/${jobId}/download-files`, {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: [outFileName],
      }),
    });

    if (!downloadRes.ok) {
      const errText = await downloadRes.text();
      throw new Error(`Request download URL failed (${downloadRes.status}): ${errText}`);
    }

    const downloadData = (await downloadRes.json()) as any;
    const downloadUrl = downloadData.download_urls?.[outFileName]?.file_url;
    if (!downloadUrl) {
      throw new Error(`Download URL not found in response for ${outFileName}`);
    }

    // 7. Download ZIP and extract via native tar
    console.log("[Sarvam] Downloading output ZIP file...");
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) {
      throw new Error(`Failed to download result ZIP: ${fileRes.statusText}`);
    }

    const zipBuffer = Buffer.from(await fileRes.arrayBuffer());
    
    // Write ZIP to unique temp folder inside scratch
    const scratchDir = path.join(process.cwd(), "scratch");
    const tempJobDir = path.join(scratchDir, `job_${jobId}`);
    if (!fs.existsSync(tempJobDir)) {
      fs.mkdirSync(tempJobDir, { recursive: true });
    }
    
    const zipPath = path.join(tempJobDir, "output.zip");
    fs.writeFileSync(zipPath, zipBuffer);

    console.log(`[Sarvam] Unzipping output into ${tempJobDir}...`);
    try {
      execSync(`tar -xf "${zipPath}" -C "${tempJobDir}"`);
      const extractedMdPath = path.join(tempJobDir, "document.md");
      if (!fs.existsSync(extractedMdPath)) {
        throw new Error("Expected document.md was not found in extracted output");
      }

      let transcription = fs.readFileSync(extractedMdPath, "utf-8");
      
      // Clean up temp job directory
      try {
        fs.rmSync(tempJobDir, { recursive: true, force: true });
      } catch (rmErr) {
        console.warn(`[Sarvam] Failed to clean up temp directory ${tempJobDir}:`, rmErr);
      }

      // Strip any inline base64 image strings to keep OCR transcript clean
      transcription = transcription.replace(/!\[Image\]\(data:[^)]+\)/g, "").trim();
      return transcription;
    } catch (unzipErr) {
      // Cleanup on error
      try {
        if (fs.existsSync(tempJobDir)) {
          fs.rmSync(tempJobDir, { recursive: true, force: true });
        }
      } catch {}
      throw unzipErr;
    }
  } catch (error) {
    throw new PrepForgeError({
      kind: "evaluation_error",
      component: "digitizeDocument",
      message: `Sarvam Document Digitization failed: ${error instanceof Error ? error.message : String(error)}`,
      statusCode: 502,
      cause: error,
    });
  }
}
