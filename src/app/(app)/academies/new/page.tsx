import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AcademyForm } from "@/components/forms";
import { Brand, PageHeading } from "@/components/ui";
export default function NewAcademy() {
  return <main className="selection-page"><header className="selection-header"><Brand /></header><Link className="back-link" href="/academies"><ArrowLeft size={16} />Suas academias</Link><PageHeading eyebrow="UM NOVO COMEÇO" title="Crie sua academia">Você será o responsável por este espaço.</PageHeading><section className="panel form-panel"><AcademyForm /></section></main>;
}
