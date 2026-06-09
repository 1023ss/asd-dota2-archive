import { CommunityContentAdmin } from "@/components/admin/CommunityContentAdmin";

export default function AdminBulletinsPage() {
  return (
    <CommunityContentAdmin
      table="bulletins"
      title="ASD 大字报管理"
      label="Admin Bulletins"
      description="管理首页和大字报历史页展示的社区公告。"
      listTitle="大字报列表"
      titlePlaceholder="大字报标题"
      secondaryField={{
        key: "subtitle",
        label: "副标题",
        placeholder: "副标题",
      }}
      frontPath="/bulletins"
    />
  );
}
