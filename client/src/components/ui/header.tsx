import { useState } from "react";
import { 
  Bell, 
  Search as SearchIcon,
  ChevronDown,
  Menu
} from "lucide-react";
import { useSidebar } from "@/hooks/use-sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  title: string;
  onSearchPolicies?: (query: string) => void;
}

export default function Header({ title, onSearchPolicies }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { toggleSidebar } = useSidebar();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchPolicies && searchQuery.trim()) {
      onSearchPolicies(searchQuery);
    }
  };

  return (
    <header className="h-16 border-b border-neutral-200 bg-white flex items-center px-4 md:px-6 justify-between">
      <div className="flex items-center">
        {/* Hamburger menu for mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="mr-2"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1.5 h-2 w-2 bg-primary rounded-full"></span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>New policy added</DropdownMenuItem>
            <DropdownMenuItem>Policy update request</DropdownMenuItem>
            <DropdownMenuItem>AI search insights available</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Search */}
        {onSearchPolicies && (
          <form 
            className="hidden sm:flex items-center border rounded-md px-3 py-1.5 bg-neutral-100"
            onSubmit={handleSearch}
          >
            <SearchIcon className="h-4 w-4 text-neutral-500 mr-2" />
            <Input
              type="text"
              placeholder="Search policies..."
              className="bg-transparent border-0 outline-none text-sm w-40 p-0 h-6 focus-visible:ring-0 focus-visible:ring-offset-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        )}
      </div>
    </header>
  );
}
