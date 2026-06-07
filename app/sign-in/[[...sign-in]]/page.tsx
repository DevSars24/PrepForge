import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="sign-in-page">
      <div className="auth-container">
        <SignIn
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
