import { signOutAction } from "@/lib/auth/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="cursor-pointer text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        Sign out
      </button>
    </form>
  );
}
