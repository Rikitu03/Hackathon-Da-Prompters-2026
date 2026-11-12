import { endpoint, json, requireAdmin } from "@/lib/api";
export async function GET() {
  return endpoint(async () => {
    const { user, role } = await requireAdmin();
    return json({ user: { id: user.id, email: user.email }, role });
  });
}
