import { useState } from 'react';

import type { Alias } from '@cos/shared';

import { RetroButton } from '../ui/RetroButton';
import { RetroPanel } from '../ui/RetroPanel';

export const AliasOnboarding = ({
  aliases,
  isPending,
  onCreate,
  error,
}: {
  aliases: Alias[];
  isPending: boolean;
  onCreate: (pseudo: string) => void;
  error: string | null;
}) => {
  const [pseudo, setPseudo] = useState('');

  return (
    <RetroPanel title="Reserve tes alias">
      <div className="grid gap-4">
        <p>Chaque compte COS_ peut reserver jusqu&apos;a trois pseudos.</p>
        <ul className="grid gap-2">
          {aliases.length ? aliases.map((alias) => <li key={alias.id}>{alias.pseudo}</li>) : <li>Aucun alias reserve.</li>}
        </ul>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate(pseudo);
          }}
        >
          <input
            className="retro-input"
            value={pseudo}
            onChange={(event) => setPseudo(event.target.value)}
            placeholder="Pseudo old school"
            autoComplete="nickname"
          />
          {error ? <p className="text-cos-danger">{error}</p> : null}
          <RetroButton type="submit" disabled={isPending || aliases.length >= 3}>
            {aliases.length >= 3 ? 'Limite atteinte' : isPending ? 'Reservation...' : 'Reserver un alias'}
          </RetroButton>
        </form>
      </div>
    </RetroPanel>
  );
};
