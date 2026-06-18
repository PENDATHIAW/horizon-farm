import Commitments from "./components/Commitments"
import Contact from "./components/Contact"
import Footer from "./components/Footer"
import Header from "./components/Header"
import Hero from "./components/Hero"
import Products from "./components/Products"
import Story from "./components/Story"

export default function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Products />
        <Commitments />
        <Story />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
