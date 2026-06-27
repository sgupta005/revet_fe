"use client"

import { LogOut } from "lucide-react"

import { signOut } from "@/app/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserMenu({
  login,
  avatarUrl,
}: {
  login: string
  avatarUrl: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-none px-1 py-1 text-sm outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring">
        <Avatar className="size-6">
          <AvatarImage src={avatarUrl} alt={login} />
          <AvatarFallback>{login.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="font-medium">{login}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{login}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            void signOut()
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
