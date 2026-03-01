/**
 * Página pública para establecer contraseña desde invitación por email
 * Ruta: /establecer-contrasena?token=xxx
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api';
import { Loader2, KeyRound, AlertTriangle } from 'lucide-react';

export default function EstablecerContrasena() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [nombre, setNombre] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [repetir, setRepetir] = useState('');
  const [loading, setLoading] = useState(!!token);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenInvalido, setTokenInvalido] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenInvalido(true);
      setLoading(false);
      return;
    }
    api
      .get<{ email: string; nombre: string }>(`/auth/invitacion/${token}`)
      .then((data) => {
        setEmail(data.email);
        setNombre(data.nombre);
      })
      .catch(() => {
        setTokenInvalido(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== repetir) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setSubmitting(true);
    try {
      await api.post<{ mensaje: string }>('/auth/establecer-contrasena', { token, password });
      navigate('/login', { state: { mensaje: 'Contraseña establecida correctamente. Ya puedes iniciar sesión.' } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al establecer la contraseña');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (tokenInvalido || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Enlace inválido
            </CardTitle>
            <CardDescription>
              El enlace de invitación no es válido o ha caducado. Solicita uno nuevo al administrador de tu farmacia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')} className="w-full">
              Ir a iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Crear contraseña
          </CardTitle>
          <CardDescription>
            {nombre ? (
              <>Hola, <strong>{nombre}</strong>. Elige una contraseña para acceder a tu cuenta.</>
            ) : (
              'Introduce tu nueva contraseña'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {email && (
              <p className="text-sm text-muted-foreground">
                Cuenta: {email}
              </p>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repetir">Repetir contraseña</Label>
              <Input
                id="repetir"
                type="password"
                value={repetir}
                onChange={(e) => setRepetir(e.target.value)}
                placeholder="Repite la contraseña"
                minLength={6}
                required
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <KeyRound className="h-4 w-4 mr-2" />
              )}
              Establecer contraseña
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
