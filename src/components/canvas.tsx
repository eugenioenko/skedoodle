export const Canvas = () => {
  return (
    <main className="min-w-dvw min-h-dvh flex flex-col">
      <div className="bg-gray-500 h-12">topbar</div>
      <div className="flex-grow flex">
        <div className="bg-gray-600 w-12"></div>
        <div className="flex-grow">canvas</div>
        <div className="bg-gray-600 w-48"></div>
      </div>
      <div className="bg-gray-500 h-6">toolbar</div>
    </main>
  );
};
