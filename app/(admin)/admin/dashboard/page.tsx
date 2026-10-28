
import PageContainer from "@/components/custom/page-container";
import { Button } from "@/components/ui/button";
import { Metadata } from "next";
import DemoByIpanks from "./demo";


export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <PageContainer
      pageTitle="Dashboard"
      pageDescription="Dashboard"
      pageHeaderAction={<Button>Add</Button>}
    >
      <DemoByIpanks />
    </PageContainer>
  );
}
