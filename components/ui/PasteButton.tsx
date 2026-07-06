"use client";

import Button from "./Button";
import { PasteIcon } from "./icons";
import { useT } from "@/context/I18nProvider";

/**
 * Secondary "Paste" button that reads the clipboard into a URL field.
 * Shared by the homepage QuickCreate box and the Create Link page so the
 * control looks and behaves identically everywhere.
 */
export default function PasteButton({
  onPaste,
}: {
  onPaste: (text: string) => void;
}) {
  const t = useT();

  async function paste() {
    try {
      const text = await navigator.clipboard?.readText();
      if (text) onPaste(text.trim());
    } catch {
      /* Clipboard read may be blocked — user can type/paste manually. */
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={paste}
      aria-label={t("common.paste")}
    >
      <PasteIcon className="h-4 w-4" />
      <span className="hidden sm:inline">{t("common.paste")}</span>
    </Button>
  );
}
