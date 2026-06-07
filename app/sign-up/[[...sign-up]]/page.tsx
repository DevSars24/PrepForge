import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="sign-in-page">
      <div className="auth-container">
        <SignUp
          appearance={{
            elements: {
              rootBox: "clerk-root",
              card: "clerk-card",
            },
          }}
        />
      </div>
    </main>
  );
}
