import { CommunityContentAdmin } from "@/components/admin/CommunityContentAdmin";

export default function AdminSponsorsPage() {
  return (
    <CommunityContentAdmin
      table="sponsor_posts"
      title="赞助展示管理"
      label="Admin Sponsors"
      description="管理首页和赞助历史页展示的赞助记录。"
      listTitle="赞助记录列表"
      titlePlaceholder="赞助展示标题"
      secondaryField={{
        key: "sponsor_name",
        label: "赞助方",
        placeholder: "赞助方名称",
      }}
      includeLinkUrl
      frontPath="/sponsors"
    />
  );
}
