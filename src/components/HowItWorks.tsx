import stepSubmit from "@/assets/step-submit.gif";
import stepEvaluate from "@/assets/step-evaluate.gif";
import stepDebate from "@/assets/step-debate.gif";

const STEPS = [
  {
    num: "01",
    title: "SUBMIT",
    desc: "Enter your project details, architecture, demo transcript, and upload presentation materials.",
    img: stepSubmit,
  },
  {
    num: "02",
    title: "EVALUATE",
    desc: "5 specialized AI judges score your project live — technical, business, product, risk & innovation.",
    img: stepEvaluate,
  },
  {
    num: "03",
    title: "LIVE DEBATE",
    desc: "Judges debate in real-time conversation, challenge each other, and reach a final consensus score.",
    img: stepDebate,
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16">
      <div className="text-center mb-12">
        <h2 className="font-logo text-2xl font-bold tracking-wider mb-2">HOW IT WORKS</h2>
        <p className="text-muted-foreground text-sm">Three steps to get your project evaluated by AI experts</p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {STEPS.map((step) => (
          <div key={step.num} className="group text-center space-y-4">
            <div className="relative mx-auto w-40 h-40 rounded-xl overflow-hidden border-2 border-border group-hover:border-foreground/40 transition-all duration-300">
              <img src={step.img} alt={step.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <span className="absolute bottom-2 left-3 font-logo text-3xl font-black text-foreground/20">{step.num}</span>
            </div>
            <div>
              <h3 className="font-logo text-lg font-bold tracking-wider">{step.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[250px] mx-auto">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
