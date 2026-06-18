import Commitments from './components/Commitments'
import BenefitsBar from './components/BenefitsBar'
import Contact from './components/Contact'
import Footer from './components/Footer'
import Header from './components/Header'
import Hero from './components/Hero'
import Products from './components/Products'
import Story from './components/Story'
import Traceability from './components/Traceability'

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <BenefitsBar />
        <Products />
        <Traceability />
        <Commitments />
        <Story />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
