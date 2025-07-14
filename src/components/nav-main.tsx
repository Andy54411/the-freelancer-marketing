'use client';

import { useState } from 'react';
import {
  Mail as IconMail,
  ChevronDown as IconChevronDown,
  type LucideIcon as Icon,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// import { Button } from "@/components/ui/button" // Marked as unused
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: Icon;
    onClick?: () => void;
    isActive?: boolean;
  }[];
}) {
  const { t } = useLanguage();
  const [isPostfachOpen, setPostfachOpen] = useState(false);

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex flex-col gap-1">
            <SidebarMenuButton
              tooltip={t('navigation.inbox')}
              onClick={() => setPostfachOpen(prev => !prev)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <IconMail />
                <span>{t('navigation.inbox')}</span>
              </div>
              <IconChevronDown
                className={`transition-transform duration-200 ${isPostfachOpen ? 'rotate-180' : ''}`}
              />
            </SidebarMenuButton>

            {isPostfachOpen && (
              <SidebarMenuSub>
                <SidebarMenuSubButton size="sm">{t('inbox.newRequests')}</SidebarMenuSubButton>
                <SidebarMenuSubButton size="sm">{t('inbox.sentOffers')}</SidebarMenuSubButton>
                <SidebarMenuSubButton size="sm">{t('inbox.archive')}</SidebarMenuSubButton>
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarMenu>
          {items.map(item => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                onClick={item.onClick}
                className={`cursor-pointer transition-colors duration-200 
                  ${item.isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                    : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
              >
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
