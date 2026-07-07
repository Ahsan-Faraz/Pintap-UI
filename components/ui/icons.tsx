/**
 * App icon set. Thin wrappers over lucide-react so every call site keeps the
 * same `{ className }` API and the project's default 20×20 / currentColor look.
 */
import type { ComponentType, CSSProperties } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Clipboard,
  Compass,
  Copy,
  CreditCard,
  Euro,
  ExternalLink,
  Gauge,
  Globe,
  HelpCircle,
  Home,
  Info,
  LayoutGrid,
  Link2,
  Lock,
  LogOut,
  type LucideProps,
  Menu,
  Pencil,
  Plus,
  Receipt,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Store,
  Tag,
  Target,
  Trash2,
  Upload,
  User,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type IconProps = { className?: string; style?: CSSProperties };

/** Wrap a lucide icon so it inherits the legacy default size + currentColor. */
function make(Icon: ComponentType<LucideProps>) {
  const Wrapped = ({ className, style }: IconProps) => (
    <Icon
      className={cn("h-5 w-5", className)}
      style={style}
      strokeWidth={2}
      aria-hidden="true"
    />
  );
  Wrapped.displayName = Icon.displayName ?? "Icon";
  return Wrapped;
}

export const HomeIcon = make(Home);
export const CompassIcon = make(Compass);
export const PlusIcon = make(Plus);
export const LinkIcon = make(Link2);
export const WalletIcon = make(Wallet);
export const EuroIcon = make(Euro);
export const UserIcon = make(User);
export const ReceiptIcon = make(Receipt);
export const HelpIcon = make(HelpCircle);
export const StoreIcon = make(Store);
export const TagIcon = make(Tag);
export const ClockIcon = make(Clock);
export const CardIcon = make(CreditCard);
export const SettingsIcon = make(Settings);
export const GaugeIcon = make(Gauge);
export const GlobeIcon = make(Globe);
export const UsersIcon = make(Users);
export const ActivityIcon = make(Activity);
export const UploadIcon = make(Upload);
export const SearchIcon = make(Search);
export const MenuIcon = make(Menu);
export const XIcon = make(X);
export const ChevronRightIcon = make(ChevronRight);
export const ArrowLeftIcon = make(ArrowLeft);
export const PencilIcon = make(Pencil);
export const ChevronDownIcon = make(ChevronDown);
export const ChevronUpIcon = make(ChevronUp);
export const ExternalLinkIcon = make(ExternalLink);
export const ShareIcon = make(Share2);
export const CheckCircleIcon = make(CheckCircle2);
export const BoltIcon = make(Zap);
export const ShieldIcon = make(ShieldCheck);
export const AlertIcon = make(AlertTriangle);
export const InfoIcon = make(Info);
export const BellIcon = make(Bell);
export const CopyIcon = make(Copy);
export const TrendUpIcon = make(ArrowUpRight);
export const TrendDownIcon = make(ArrowDownRight);
export const LockIcon = make(Lock);
export const PasteIcon = make(Clipboard);
export const TargetIcon = make(Target);
export const TrashIcon = make(Trash2);
export const CameraIcon = make(Camera);
export const LogOutIcon = make(LogOut);
export const MoreIcon = make(LayoutGrid);
