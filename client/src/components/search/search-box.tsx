import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchBoxProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export default function SearchBox({ onSearch, isLoading = false }: SearchBoxProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <div className="relative mb-6">
      <form 
        className="flex items-center bg-white border border-neutral-300 rounded-lg overflow-hidden"
        onSubmit={handleSubmit}
      >
        <Input
          type="text"
          placeholder="Ask about a policy..."
          className="flex-1 px-4 py-3 text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button 
          type="submit"
          className="bg-primary hover:bg-primary-dark text-white px-4 py-3 h-full rounded-none"
          disabled={isLoading || !query.trim()}
        >
          <Search className="h-4 w-4 mr-1" />
          Search
        </Button>
      </form>
    </div>
  );
}
