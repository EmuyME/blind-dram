"use client";

interface ParticipantProgressProps {
  participants: Array<{
    id: string;
    display_name: string;
    status: 'draft' | 'submitted' | 'graded';
  }>;
}

export function ParticipantProgress({ participants }: ParticipantProgressProps) {
  const statusConfig = {
    draft: { 
      text: '編集中', 
      bgColor: 'bg-neutral-800', 
      textColor: 'text-stone-400',
      borderColor: 'border-white/10',
      icon: '✏️'
    },
    submitted: { 
      text: '提出済', 
      bgColor: 'bg-neutral-800', 
      textColor: 'text-sky-300',
      borderColor: 'border-sky-400/30',
      icon: '✓'
    },
    graded: { 
      text: '採点済', 
      bgColor: 'bg-neutral-800', 
      textColor: 'text-emerald-300',
      borderColor: 'border-emerald-400/30',
      icon: '✓✓'
    },
  };

  if (participants.length === 0) {
    return (
      <div className="ui-card p-6">
        <h3 className="ui-h3 mb-4">参加者進捗</h3>
        <p className="text-sm ui-muted text-center py-4">参加者がいません</p>
      </div>
    );
  }

  return (
    <div className="ui-card p-6">
      <h3 className="ui-h3 mb-4">参加者進捗</h3>
      <div className="space-y-3">
        {participants.map((participant) => {
          const config = statusConfig[participant.status];
          return (
            <div 
              key={participant.id} 
              className={`flex items-center justify-between p-3 rounded-xl border ${config.borderColor} ${config.bgColor} transition-all`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{config.icon}</span>
                <span className="text-base font-medium text-stone-100">{participant.display_name}</span>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${config.textColor} border ${config.borderColor}`}>
                {config.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
