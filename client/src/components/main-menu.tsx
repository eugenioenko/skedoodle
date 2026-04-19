import {
  IconDownload,
  IconMenu2,
  IconUpload,
} from "@tabler/icons-react";
import { useState } from "react";
import { Dropdown, DropdownItem } from "./ui/dropdown";
import { ToolbarDivider } from "./ui/toolbar-divider";
import { useToastStore } from "./ui/toasts";
import { ExportDialog } from "./export-dialog";

export const MainMenu = () => {
  const [exportOpen, setExportOpen] = useState(false);
  const notImplemented = () => useToastStore.getState().addToast("Coming soon");

  return (
    <>
      <div className="w-14 self-stretch flex items-center justify-center flex-shrink-0">
        <Dropdown
          hover={false}
          placement="bottom-start"
          trigger={
            <button type="button" className="p-1 rounded hover:bg-default-3">
              <IconMenu2 size={20} stroke={1} />
            </button>
          }
        >
          <DropdownItem
            label="Export…"
            icon={<IconDownload size={16} stroke={1} />}
            onClick={() => setExportOpen(true)}
          />
          <DropdownItem
            label="Import"
            icon={<IconUpload size={16} stroke={1} />}
            onClick={notImplemented}
          />
        </Dropdown>
      </div>
      <ToolbarDivider />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
    </>
  );
};
