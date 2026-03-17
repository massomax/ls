/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import { Button } from "@ui/components";
import { isApiError } from "@/lib/api/apiError";
import { useUploadImages } from "@/lib/queries/uploads";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

export default function SellerImagesField({
  value,
  onChange,
  disabled = false,
}: Props) {
  const uploadMutation = useUploadImages();
  const [files, setFiles] = useState<File[]>([]);

  const uploadError = useMemo(() => {
    if (!uploadMutation.error) return null;
    return isApiError(uploadMutation.error)
      ? `${uploadMutation.error.code}: ${uploadMutation.error.message}`
      : "Не удалось загрузить изображения.";
  }, [uploadMutation.error]);

  const onUpload = async () => {
    if (files.length === 0 || disabled) return;

    try {
      const res = await uploadMutation.mutateAsync(files);
      const urls = res.items.map((item) => item.url);
      onChange([...value, ...urls]);
      setFiles([]);
    } catch {
      // Ошибка отображается через uploadError
    }
  };

  const onRemove = (url: string) => {
    onChange(value.filter((item) => item !== url));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="text-sm font-medium text-lp-text">Фото товара</div>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={disabled || uploadMutation.isPending}
          onChange={(event) => {
            const nextFiles = Array.from(event.target.files ?? []);
            setFiles(nextFiles);
          }}
          className="block w-full text-sm text-lp-text file:mr-3 file:rounded-xl file:border file:border-lp-border file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-lp-text hover:file:bg-slate-50"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => void onUpload()}
          disabled={disabled || uploadMutation.isPending || files.length === 0}
        >
          {uploadMutation.isPending ? "Загрузка..." : "Загрузить"}
        </Button>
        {files.length > 0 ? (
          <div className="text-xs text-lp-muted">
            Выбрано файлов: {files.length}
          </div>
        ) : null}
      </div>

      {uploadError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {uploadError}
        </div>
      ) : null}

      {value.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {value.map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="relative overflow-hidden rounded-xl border border-lp-border"
            >
              <div
                className="aspect-[4/3] w-full"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(11,27,51,0.10), rgba(246,183,60,0.12))",
                }}
              />
              <img
                src={url}
                alt="Фото товара"
                loading="lazy"
                decoding="async"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(url)}
                className="absolute right-2 top-2 rounded-full border border-lp-border bg-white/90 px-2 py-1 text-xs font-semibold text-lp-text shadow-sm hover:bg-white"
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-lp-muted">
          Пока нет загруженных фото.
        </div>
      )}
    </div>
  );
}
