import Image from 'next/image'

export default function Home() {
  const res =  {
    app : "API Coklit Perumdam Tirta Wilis",
    versi : "Versi 1.0"
  }

  const result = JSON.stringify(res);
  return (result)
}
