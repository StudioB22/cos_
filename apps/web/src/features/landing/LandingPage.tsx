import { Link } from 'react-router-dom';

import { BlinkingCursor } from '../ui/BlinkingCursor';
import { RetroButton } from '../ui/RetroButton';
import { RetroPanel } from '../ui/RetroPanel';

const features = [
  '3 alias max par compte',
  '50+ salons publics seedes',
  'Salons prives avec admin/invitations',
  'MP, ignore, smileys retro',
  'Messages en RAM, reset au restart',
  'Stack React / Node / Socket.io / SQLite',
];

const roadmap = [
  ['Sprint 1', 'Landing live, monorepo, CI et design retro'],
  ['Sprint 2', 'SQLite, auth demo, alias et salons persistants'],
  ['Sprint 3', 'Temps reel, MP, ignore, salons prives invites'],
  ['Sprint 4', 'QA happy/sad/edge, docs, Docker, deploy final'],
];

export const LandingPage = () => {
  return (
    <main className="min-h-screen bg-cos-bg bg-grid bg-[size:26px_26px] px-4 py-6 text-cos-ink">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <RetroPanel>
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-[0.35em] text-cos-sky/90">
                Morse -.... --- ...
              </p>
              <h1 className="font-pixel text-5xl uppercase leading-none text-cos-neon md:text-7xl">
                COS
                <BlinkingCursor />
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-cos-ink/85">
                Chat Old School est un clone retro portfolio, pense comme un salon web 90s
                modernise: tables HTML, lueurs neon, smileys absurdes, salons publics ouverts et
                salons prives controles par leur createur.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/app">
                  <RetroButton>Entrer dans COS_</RetroButton>
                </Link>
                <a href="#stack">
                  <RetroButton variant="secondary">Voir la stack</RetroButton>
                </a>
              </div>
            </div>

            <table className="retro-table w-full">
              <tbody>
                <tr>
                  <th>Etat</th>
                  <td>Portfolio full-stack live</td>
                </tr>
                <tr>
                  <th>UI</th>
                  <td>Neon vert/bleu + panel bitmap</td>
                </tr>
                <tr>
                  <th>Backend</th>
                  <td>Express + Socket.io + SQLite</td>
                </tr>
                <tr>
                  <th>Persistance</th>
                  <td>Users, alias, rooms, memberships</td>
                </tr>
                <tr>
                  <th>Memoire</th>
                  <td>Messages, MP, ignore, presence</td>
                </tr>
                <tr>
                  <th>Deploiement</th>
                  <td>Vercel + Render</td>
                </tr>
              </tbody>
            </table>
          </div>
        </RetroPanel>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <RetroPanel title="Fonctions cle">
            <ul className="grid gap-2 text-lg">
              {features.map((feature) => (
                <li key={feature} className="border border-cos-sky/20 bg-cos-sky/5 px-3 py-2">
                  {feature}
                </li>
              ))}
            </ul>
          </RetroPanel>

          <RetroPanel title="Roadmap live">
            <table className="retro-table w-full">
              <tbody>
                {roadmap.map(([step, detail]) => (
                  <tr key={step}>
                    <th>{step}</th>
                    <td>{detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </RetroPanel>
        </div>

        <RetroPanel title="Stack & architecture" className="anchor-panel" >
          <div id="stack" className="grid gap-4 lg:grid-cols-3">
            <article className="space-y-2">
              <h2 className="font-pixel text-2xl text-cos-neon">Front</h2>
              <p>React, Vite, Tailwind retro, React Query, Router et socket client types.</p>
            </article>
            <article className="space-y-2">
              <h2 className="font-pixel text-2xl text-cos-neon">Back</h2>
              <p>Express modulaire, Socket.io, SQLite et architecture hexagonale par feature.</p>
            </article>
            <article className="space-y-2">
              <h2 className="font-pixel text-2xl text-cos-neon">QA</h2>
              <p>Vitest, integration HTTP/realtime, smoke e2e, CI et SonarQube.</p>
            </article>
          </div>
        </RetroPanel>
      </div>
    </main>
  );
};
