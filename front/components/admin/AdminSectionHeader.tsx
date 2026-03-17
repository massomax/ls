import React from "react";
import { SectionTitle } from "@ui/components";

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function AdminSectionHeader({
  title,
  description,
  action,
}: Props) {
  return <SectionTitle title={title} hint={description} action={action} />;
}
