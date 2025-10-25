import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, User } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface SignatureAuditCardProps {
  report: any;
  auditLog: any[];
  status: 'draft' | 'verified' | 'shared';
}

export function SignatureAuditCard({ report, auditLog, status }: SignatureAuditCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Signature & Audit Trail</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* E-Signature Block */}
        {report.is_signed ? (
          <div className="bg-primary/5 border-l-4 border-primary p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-foreground mb-1">
                  ✓ Verified DentaRad Report
                </div>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Signed by:</span>{' '}
                    <span className="font-medium">
                      {report.signatory_name || 'Dr Mohamed Elmedani'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Credentials:</span>{' '}
                    <span className="font-medium">
                      {report.signatory_credentials || 'BDS, FDSRCS, FRCR'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Title:</span>{' '}
                    <span className="font-medium">Consultant Radiologist</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date & Time:</span>{' '}
                    <span className="font-medium">
                      {new Date(report.signed_at).toLocaleString('en-GB', {
                        dateStyle: 'long',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  {report.version > 1 && (
                    <div>
                      <Badge variant="outline" className="mt-2">
                        Version {report.version}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-muted/50 p-4 rounded-lg text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              Report not yet verified
            </div>
          </div>
        )}

        <Separator />

        {/* Audit Trail */}
        <div>
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground">
            Recent Activity
          </h3>
          {auditLog.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No audit records available
            </div>
          ) : (
            <div className="space-y-3">
              {auditLog.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 text-sm border-l-2 border-muted pl-3"
                >
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">{log.action}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('en-GB', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
