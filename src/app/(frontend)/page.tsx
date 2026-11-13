import type { Metadata } from 'next'
import RiffChat from '@/components/riff/RiffChat'

export const metadata: Metadata = {
  title: 'RIFF — Local Intelligence. Loud Attitude.',
  description:
    'AI open-source yang berjalan di browser kamu. Tanpa API cloud, dengan pengetahuan lokal milikmu.',
}

export default function HomePage() {
  return <RiffChat />
}
