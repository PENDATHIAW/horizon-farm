import Header from './components/Header'
import Hero from './components/Hero'
import About from './components/About'
import BusinessUnits from './components/BusinessUnits'
import TallowSection from './components/TallowSection'
import Traceability from './components/Traceability'
import Sustainability from './components/Sustainability'
import Impact from './components/Impact'
import Investor from './components/Investor'
import Contact from './components/Contact'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <BusinessUnits />
        <TallowSection />
        <Traceability />
        <Sustainability />
        <Impact />
        <Investor />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
