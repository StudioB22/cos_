import { useState } from 'react';

import { RetroButton } from '../ui/RetroButton';
import { RetroPanel } from '../ui/RetroPanel';

export const AuthPanel = ({
  isPending,
  onSubmit,
  error,
}: {
  isPending: boolean;
  onSubmit: (email: string) => void;
  error: string | null;
}) => {
  const [email, setEmail] = useState('');

  return (
    <RetroPanel title="Connexion demo">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(email);
        }}
      >
        <label className="grid gap-2 text-lg">
          <span>Email</span>
          <input
            className="retro-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="benoit@studiob22.dev"
            autoComplete="email"
          />
        </label>
        {error ? <p className="text-cos-danger">{error}</p> : null}
        <RetroButton type="submit" disabled={isPending}>
          {isPending ? 'Connexion...' : 'Creer / reprendre la session'}
        </RetroButton>
      </form>
    </RetroPanel>
  );
};
