import { CloudOff, RotateCw } from 'lucide-react';
import { Button } from './Button.jsx';
import { EmptyState } from './EmptyState.jsx';

export function ErrorState({ error, onRetry }) {
  return (
    <EmptyState
      icon={CloudOff}
      title="Не вдалося завантажити"
      text={error?.message ?? 'Щось пішло не так. Спробуйте ще раз.'}
      action={
        onRetry && (
          <Button variant="secondary" icon={RotateCw} onClick={onRetry}>
            Спробувати ще
          </Button>
        )
      }
    />
  );
}
