import EaseAtlas from '@/components/ui/ease-atlas'

const settings = {
  columns: 4,
  duration: 1200,
  autoplay: true,
  showGhost: true,
  showCode: false,
}

export default function Demo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props }
  return (
    <div className="w-full max-w-5xl bg-background p-6 text-foreground">
      <EaseAtlas columns={s.columns} duration={s.duration} autoplay={s.autoplay} showGhost={s.showGhost} showCode={s.showCode} />
    </div>
  )
}
