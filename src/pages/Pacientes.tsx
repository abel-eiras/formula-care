import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, UserPlus, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { usePacientes } from "@/hooks/usePacientes";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { FiltrosAvanzados, type FiltrosPacientes } from "@/components/pacientes/FiltrosAvanzados";
import type { Paciente } from "@/types";

/**
 * Obtiene las iniciales del nombre completo
 */
const getInitials = (name: string) => {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
};

/**
 * Determina los servicios de un paciente basado en sus análisis
 */
const getServices = (paciente: Paciente): ("dermo" | "bio")[] => {
  const services: ("dermo" | "bio")[] = [];
  // Si tiene análisis dermo, agregar "dermo"
  if (paciente.analisisDermo && paciente.analisisDermo.length > 0) {
    services.push("dermo");
  }
  // Si tiene análisis bio, agregar "bio"
  if (paciente.analisisBio && paciente.analisisBio.length > 0) {
    services.push("bio");
  }
  return services.length > 0 ? services : paciente.services || [];
};

export default function Pacientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtros, setFiltros] = useState<FiltrosPacientes>({});
  
  // Combinar búsqueda rápida con filtros avanzados
  const filtrosCompletos: FiltrosPacientes = {
    ...filtros,
    busqueda: searchTerm || undefined,
  };
  
  const { data: pacientes = [], isLoading, error } = usePacientes(filtrosCompletos);

  if (isLoading) {
    return <LoadingSpinner text="Cargando pacientes..." />;
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Error al cargar pacientes. Verifica que el backend esté corriendo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground">Gestión de pacientes registrados</p>
        </div>
        <Button size="lg" className="shadow-md hover:shadow-lg transition-shadow" asChild>
          <Link to="/pacientes/nuevo">
            <UserPlus className="mr-2 h-5 w-5" />
            Nuevo Paciente
          </Link>
        </Button>
      </div>

      {/* Search & Filters */}
      <Card className="shadow-sm border-border/50">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, teléfono o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <FiltrosAvanzados
              filtros={filtros}
              onFiltrosChange={setFiltros}
              onReset={() => {
                setFiltros({});
                setSearchTerm("");
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">
            {pacientes.length} pacientes encontrados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pacientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No se encontraron pacientes</p>
              <Button variant="link" asChild className="mt-2">
                <Link to="/pacientes/nuevo">Crear primer paciente</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="hidden sm:table-cell">Edad</TableHead>
                  <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                  <TableHead className="hidden lg:table-cell">Última Visita</TableHead>
                  <TableHead>Servicios</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pacientes.map((patient) => {
                  const services = getServices(patient);
                  return (
                    <TableRow key={patient.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-muted">
                            <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                              {getInitials(patient.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium group-hover:text-primary transition-colors">
                              {patient.name}
                            </p>
                            <p className="text-sm text-muted-foreground sm:hidden">
                              {patient.age} años • {patient.sex === "M" ? "Hombre" : patient.sex === "F" ? "Mujer" : "Otro"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {patient.age} años
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {patient.phone}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString("es-ES") : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {services.map((service) => (
                            <Badge 
                              key={service}
                              variant={service === "dermo" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {service === "dermo" ? "Dermo" : "Bio"}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/pacientes/${patient.id}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
