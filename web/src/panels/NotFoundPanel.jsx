import { Map } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';

export function NotFoundPanel({ title = 'Сторінку не знайдено', text = 'Можливо, посилання застаріло.' }) {
  return (
    <EmptyState
      icon={Map}
      title={title}
      text={text}
      action={
        <Button as={Link} to="/" variant="secondary">
          На карту
        </Button>
      }
    />
  );
}
