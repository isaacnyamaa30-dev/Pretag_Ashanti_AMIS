import { PageHeader, Card } from "@/components/ui";
import { UploadForm } from "@/components/UploadForm";

export const metadata = { title: "Upload R20 - PRETAG AMIS" };

export default function UploadPage() {
  return (
    <>
      <PageHeader
        title="Upload R20"
        sub="The monthly Ashanti Regional R20. One approved R20 per month."
      />
      <Card>
        <UploadForm />
      </Card>
    </>
  );
}
