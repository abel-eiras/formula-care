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
import { Search, UserPlus, Filter, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Patient {
  id: string;
  name: string;
  age: number;
  sex: "M" | "F";
  phone: string;
  lastVisit: string;
  services: ("dermo" | "bio")[];
}

const patients: Patient[] = [
  { id: "1", name: "María García López", age: 45, sex: "F", phone: "612 345 678", lastVisit: "2024-01-15", services: ["dermo", "bio"] },
  { id: "2", name: "Carlos Rodríguez", age: 62, sex: "M", phone: "698 765 432", lastVisit: "2024-01-14", services: ["bio"] },
  { id: "3", name: "Ana Fernández", age: 33, sex: "F", phone: "654 321 987", lastVisit: "2024-01-13", services: ["dermo"] },
  { id: "4", name: "Pedro Martínez", age: 55, sex: "M", phone: "666 111 222", lastVisit: "2024-01-12", services: ["bio"] },
  { id: "5", name: "Laura Sánchez", age: 28, sex: "F", phone: "677 888 999", lastVisit: "2024-01-10", services: ["dermo"] },
  { id: "6", name: "José Antonio Ruiz", age: 70, sex: "M", phone: "688 444 555", lastVisit: "2024-01-08", services: ["bio", "dermo"] },
];

const getInitials = (name: string) => {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
};

export default function Pacientes() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm)
  );

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
                placeholder="Buscar por nombre o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">
            {filteredPatients.length} pacientes encontrados
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              {filteredPatients.map((patient) => (
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
                          {patient.age} años • {patient.sex === "M" ? "Hombre" : "Mujer"}
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
                    {new Date(patient.lastVisit).toLocaleDateString("es-ES")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {patient.services.map((service) => (
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
