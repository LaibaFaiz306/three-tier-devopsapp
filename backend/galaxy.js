// Places a new star on one of the galaxy's three spiral arms.
// The frontend draws the galaxy with the same spiral formula (angle = arm + r * 0.35).
function randomPosition() {
  const arms = 3;
  const arm = Math.floor(Math.random() * arms);
  const r = 4 + Math.random() * 26;
  const angle = (arm / arms) * Math.PI * 2 + r * 0.35 + (Math.random() - 0.5) * 0.45;
  return {
    x: Math.cos(angle) * r,
    y: (Math.random() - 0.5) * 2.2,
    z: Math.sin(angle) * r,
  };
}

const SEED_STARS = [
  { name: 'Luna',   message: 'May every night sky feel a little closer.', color: '#ffd166' },
  { name: 'Orion',  message: 'To curiosity, the oldest engine we have.',  color: '#7ee8fa' },
  { name: 'Nova',   message: 'Small light, long journey.',                color: '#ff7eb6' },
  { name: 'Atlas',  message: 'Carrying the weight of big dreams.',        color: '#a78bfa' },
  { name: 'Vega',   message: 'Here is to quiet mornings and loud ideas.', color: '#7cffb2' },
  { name: 'Iris',   message: 'Every color begins as light.',              color: '#ff8a5c' },
  { name: 'Cosmo',  message: 'Hello from the edge of the spiral!',        color: '#7ee8fa' },
  { name: 'Selene', message: 'Wishing you gentle tides.',                 color: '#ffd166' },
];

module.exports = { randomPosition, SEED_STARS };
