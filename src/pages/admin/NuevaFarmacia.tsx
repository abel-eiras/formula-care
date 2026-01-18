/**
 * Página para crear una nueva farmacia
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCrearFarmacia } from '@/hooks/useAdmin';
import { toast } from 'sonner';
import { ArrowLeft, Building2, User, Loader2 } from 'lucide-react';
import type { CrearFarmaciaData, PlanFarmacia } from '@/types';

// Función para generar slug
function generarSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function NuevaFarmacia() {
  const navigate = useNavigate();
  const crearMutation = useCrearFarmacia();

  const [formData, setFormData] = useState<CrearFarmaciaData>({
    nombre: '',
    slug: '',
    direccion: '',
    ciudad: '',
    telefono: '',
    email: '',
    web: '',
    plan: 'basico',
    maxUsuarios: 3,
    maxPacientes: 500,
    fechaExpiracion: '',
    adminEmail: '',
    adminPassword: '',
    adminNombre: '',
  });

  const [slugEditado, setSlugEditado] = useState(false);

  const handleNombreChange = (nombre: string) => {
    setFormData((prev) => ({
      ...prev,
      nombre,
      // Auto-generar slug si no ha sido editado manualmente
      slug: slugEditado ? prev.slug : generarSlug(nombre),
    }));
  };

  const handleSlugChange = (slug: string) => {
    setSlugEditado(true);
    setFormData((prev) => ({ ...prev, slug: generarSlug(slug) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    if (!formData.adminEmail.trim()) {
      toast.error('El email del administrador es requerido');
      return;
    }
    if (!formData.adminPassword.trim() || formData.adminPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!formData.adminNombre.trim()) {
      toast.error('El nombre del administrador es requerido');
      return;
    }

    try {
      const result = await crearMutation.mutateAsync({
        ...formData,
        slug: formData.slug || generarSlug(formData.nombre),
      });
      toast.success(`Farmacia "${result.farmacia.nombre}" creada correctamente`);
      navigate(`/admin/farmacias/${result.farmacia.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear la farmacia';
      toast.error(message);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Navegación */}
      <div className="flex items-center gap-4">
        <Link to="/admin/farmacias">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nueva Farmacia</h1>
          <p className="text-muted-foreground">
            Crear una nueva farmacia en la plataforma
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos de la farmacia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Datos de la Farmacia
            </CardTitle>
            <CardDescription>
              Información básica de la farmacia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  placeholder="Farmacia Ejemplo"
                  value={formData.nombre}
                  onChange={(e) => handleNombreChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Identificador (slug)</Label>
                <Input
                  id="slug"
                  placeholder="farmacia-ejemplo"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Se genera automáticamente del nombre
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  placeholder="Calle Principal 123"
                  value={formData.direccion}
                  onChange={(e) => setFormData((prev) => ({ ...prev, direccion: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input
                  id="ciudad"
                  placeholder="Madrid"
                  value={formData.ciudad}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ciudad: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  placeholder="900 123 456"
                  value={formData.telefono}
                  onChange={(e) => setFormData((prev) => ({ ...prev, telefono: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="info@farmacia.com"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="web">Web</Label>
                <Input
                  id="web"
                  placeholder="www.farmacia.com"
                  value={formData.web}
                  onChange={(e) => setFormData((prev) => ({ ...prev, web: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan y límites */}
        <Card>
          <CardHeader>
            <CardTitle>Plan y Límites</CardTitle>
            <CardDescription>
              Configuración del plan de suscripción
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="plan">Plan</Label>
                <Select
                  value={formData.plan}
                  onValueChange={(value: PlanFarmacia) => setFormData((prev) => ({ ...prev, plan: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basico">Básico</SelectItem>
                    <SelectItem value="profesional">Profesional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUsuarios">Máx. Usuarios</Label>
                <Input
                  id="maxUsuarios"
                  type="number"
                  min={1}
                  value={formData.maxUsuarios}
                  onChange={(e) => setFormData((prev) => ({ ...prev, maxUsuarios: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPacientes">Máx. Pacientes</Label>
                <Input
                  id="maxPacientes"
                  type="number"
                  min={1}
                  value={formData.maxPacientes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, maxPacientes: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaExpiracion">Fecha Expiración</Label>
                <Input
                  id="fechaExpiracion"
                  type="date"
                  value={formData.fechaExpiracion}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fechaExpiracion: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Opcional. Dejar vacío para sin fecha límite.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usuario administrador */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Usuario Administrador
            </CardTitle>
            <CardDescription>
              Credenciales del usuario administrador inicial de la farmacia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="adminNombre">Nombre *</Label>
                <Input
                  id="adminNombre"
                  placeholder="Juan García"
                  value={formData.adminNombre}
                  onChange={(e) => setFormData((prev) => ({ ...prev, adminNombre: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Email *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@farmacia.com"
                  value={formData.adminEmail}
                  onChange={(e) => setFormData((prev) => ({ ...prev, adminEmail: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Contraseña *</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.adminPassword}
                  onChange={(e) => setFormData((prev) => ({ ...prev, adminPassword: e.target.value }))}
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 6 caracteres
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones */}
        <div className="flex justify-end gap-4">
          <Link to="/admin/farmacias">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" disabled={crearMutation.isPending}>
            {crearMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Building2 className="mr-2 h-4 w-4" />
                Crear Farmacia
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
