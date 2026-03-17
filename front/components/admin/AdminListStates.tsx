import PageStateEmpty from "@/components/state/PageStateEmpty";
import PageStateError from "@/components/state/PageStateError";
import PageStateSkeleton from "@/components/state/PageStateSkeleton";

type Props = {
  isLoading: boolean;
  error: unknown;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription?: string;
};

export default function AdminListStates({
  isLoading,
  error,
  isEmpty,
  emptyTitle,
  emptyDescription,
}: Props) {
  if (isLoading) {
    return <PageStateSkeleton rows={4} />;
  }

  if (error) {
    return (
      <PageStateError
        title="Unable to load"
        message="Please try again later."
      />
    );
  }

  if (isEmpty) {
    return <PageStateEmpty title={emptyTitle} hint={emptyDescription} />;
  }

  return null;
}
