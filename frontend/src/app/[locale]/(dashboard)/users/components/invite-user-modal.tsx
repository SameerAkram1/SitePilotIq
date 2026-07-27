'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useInviteUser } from '@/hooks/api/use-users';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  role: z.string().min(1, 'Role is required'),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserModal({ open, onOpenChange }: InviteUserModalProps) {
  const inviteUser = useInviteUser();
  const tu = useTranslations('users');
  const tc = useTranslations('common');

  const ROLES = [
    { value: 'ADMIN', label: tu('roles.admin') },
    { value: 'PROJECT_MANAGER', label: tu('roles.project_manager') },
    { value: 'SITE_MANAGER', label: tu('roles.site_manager') },
    { value: 'ENGINEER', label: tu('roles.engineer') },
    { value: 'FINANCE_MANAGER', label: 'Finance Manager' },
    { value: 'HR_MANAGER', label: 'HR Manager' },
    { value: 'PURCHASE_MANAGER', label: 'Purchase Manager' },
    { value: 'ORDER_MANAGER', label: 'Order Manager' },
    { value: 'CONTRACT_MANAGER', label: 'Contract Manager' },
    { value: 'WORKER', label: tu('roles.worker') },
  ];

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema) as any,
  });

  const onSubmit = (data: InviteFormData) => {
    inviteUser.mutate(data, {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tu('invite_dialog_title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{tu('invite_email_label')} *</Label>
            <Input id="email" type="email" {...register('email')} placeholder={tu('invite_email_placeholder')} />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{tu('invite_role_label')} *</Label>
            <Select onValueChange={(value) => setValue('role', value)}>
              <SelectTrigger>
                <SelectValue placeholder={tu('invite_role_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobTitle">{tu('invite_jobtitle_label')}</Label>
            <Input id="jobTitle" {...register('jobTitle')} placeholder={tu('invite_jobtitle_placeholder')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">{tu('invite_department_label')}</Label>
            <Input id="department" {...register('department')} placeholder={tu('invite_department_placeholder')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={inviteUser.isPending}>
              {inviteUser.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tu('invite_sending')}
                </>
              ) : (
                tu('invite_send')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
