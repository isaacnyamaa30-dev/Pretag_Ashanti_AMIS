import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AssistantChat } from "@/components/AssistantChat";

export const metadata = { title: "Assistant - PRETAG AMIS" };

export default async function AssistantPage() {
  await requireStaff();
  const configured = !!process.env.OPENAI_API_KEY;

  return (
    <>
      <PageHeader
        title="Membership Assistant"
        sub="Ask questions about the region's membership in plain language. It answers only from the imported R20 data."
      />
      <div className="max-w-2xl">
        <AssistantChat configured={configured} />
      </div>
    </>
  );
}
