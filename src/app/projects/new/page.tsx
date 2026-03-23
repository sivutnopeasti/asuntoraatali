import { Navbar } from "@/components/navbar";
import { ProjectForm } from "@/components/project-form";

export default function NewProjectPage() {
  return (
    <>
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Uusi projekti</h1>
          <p className="text-muted-foreground">
            Täytä asunnon tiedot ja määräluettelo tarjouspyyntöä varten
          </p>
        </div>
        <ProjectForm />
      </main>
    </>
  );
}
