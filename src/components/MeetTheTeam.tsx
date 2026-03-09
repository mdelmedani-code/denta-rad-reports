const MeetTheTeam = () => {
  return (
    <section id="team" className="py-16 sm:py-20 bg-muted/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-accent uppercase tracking-wide mb-4">
          Meet the Team
        </h2>
        <div className="w-16 h-0.5 bg-accent mx-auto mb-12" />

        <div className="max-w-2xl mx-auto">
          <div className="bg-background rounded-2xl border border-border p-8 shadow-sm">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Reporting Clinician
            </p>
            <h3 className="text-2xl font-bold text-foreground mb-1">
              Dr. Mohamed Elmedani
            </h3>
            <p className="text-muted-foreground">
              Consultant Radiologist |{" "}
              <span className="italic">MBBS, FRCR</span>
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Head and Neck and GI Imaging, and Non-vascular Intervention
            </p>
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground leading-relaxed">
                GMC-registered consultant radiologist with subspecialty expertise in head and neck imaging, 
                providing professional teleradiology services to dental practitioners across the UK.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MeetTheTeam;
