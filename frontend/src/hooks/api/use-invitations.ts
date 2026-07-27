import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export function useAcceptInvitation() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (data: {
      token: string;
      fullName: string;
      phone?: string;
      password: string;
      confirmPassword: string;
    }) => {
      const response = await api.post('/users/accept-invitation', data);
      return response.data.data;
    },
    onSuccess: (data) => {
      toast.success('Account created successfully');
      router.push('/login');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to accept invitation');
    },
  });
}

export function useValidateInvitation(token: string) {
  return useMutation({
    mutationFn: async () => {
      const response = await api.get(`/users/accept-invitation/validate?token=${token}`);
      return response.data.data;
    },
  });
}
