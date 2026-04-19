import {
  IconFileTypePng,
  IconFileTypeSvg,
  IconMenu2,
  IconUpload,
} from "@tabler/icons-react";
import { Dropdown, DropdownItem } from "./ui/dropdown";
import { ToolbarDivider } from "./ui/toolbar-divider";
import { useToastStore } from "./ui/toasts";

export const MainMenu = () => {
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
            label="Export as SVG"
            icon={<IconFileTypeSvg size={16} stroke={1} />}
            onClick={notImplemented}
          />
          <DropdownItem
            label="Export as PNG"
            icon={<IconFileTypePng size={16} stroke={1} />}
            onClick={notImplemented}
          />
          <DropdownItem
            label="Import"
            icon={<IconUpload size={16} stroke={1} />}
            onClick={notImplemented}
          />
        </Dropdown>
      </div>
      <ToolbarDivider />
    </>
  );
};
