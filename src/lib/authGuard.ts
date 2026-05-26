import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/auth';

export const useAuthCheckout = () => {
  const router = useRouter();
  const handleCheckout = () => {
    if (typeof window === 'undefined') return;
    const savedUser = getStoredUser();
    if (!savedUser) {
      toast('Please log in to checkout');
      router.replace('/login?callbackUrl=/checkout');
      return;
    }
    router.push('/checkout');
  };
  return { handleCheckout };
};
