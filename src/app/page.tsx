import Experience from "@/components/Experience";

/**
 * Server shell: crawlable narrative content for SEO and screen readers,
 * visually replaced by the client experience once it hydrates.
 */
export default function Home() {
  return (
    <main>
      <h1 className="sr-only">
        The Odyssey Voyage — an unofficial, fan-made immersive tribute
        celebrating the excitement around Christopher Nolan&apos;s film
      </h1>
      <p className="sr-only">
        Take the helm of an ancient ship on an open, cinematic night sea.
        Sail freely by wind and constellation to discover the Siren Gates,
        the Drowned Temple, the Glowing Cave, the Watchfire Isle, and the
        Sunken City — solve their riddles, gather the fragments of a
        forgotten chart, and let it reveal the city beyond the fog. Inspired
        by the timeless themes of Homer&apos;s epic: the journey, homecoming,
        courage, curiosity, sacrifice, friendship, and the unknown. Leave a
        reflection in the global voyage log, mark your harbour on the
        travellers&apos; map, and count down to the premiere on July 17,
        2026 with fans around the world. This is an independent fan project
        by movie and storytelling enthusiasts — not affiliated with,
        endorsed by, or an official product of the filmmakers, studio,
        distributors, or rights holders. All narrative content draws on
        Samuel Butler&apos;s public-domain translation of Homer.
      </p>
      <noscript>
        <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
          <p>
            This voyage needs JavaScript to set sail. Enable it, then return
            to the shore — the sea will be waiting.
          </p>
        </div>
      </noscript>
      <Experience />
    </main>
  );
}
