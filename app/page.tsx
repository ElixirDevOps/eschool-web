export default function Home() {
  return (
    <main>
      <h1>{productName()}</h1>
      <p>Nothing here is yours yet. The first requirement on the record says what to do about that.</p>
    </main>
  );
}

/** The product's own name. Changing this is the first witnessed change. */
export function productName(): string {
  return 'A new app';
}
