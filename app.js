/* ================================================================
CEE MOCK PORTAL — client application
Runs in two modes:
- GAS mode (deployed): talks to Google Apps Script via fetch
- Preview mode (sandbox): identical UI on a simulated backend (localStorage)
================================================================ */
'use strict';
/* ---------------- 1. constants & syllabus topics ---------------- */
var IS_GAS = !!(typeof google !== 'undefined' && google.script && google.script.run);
var APPSCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw-RTHCEahLHmuZlSIqM5LE7qL_YwVlc9-tbJDCtQyzxGB9s28XXlCB_8obRnimNuMTLA/exec';
var APP_NAME = 'CEE Mock Portal';

/* MECEE-BL 2026 official unit structure (Third Review, April 28 2026):
* Biology is split into Zoology + Botany; Mathematics is replaced by the
* Mental Agility Test (MAT). Legacy sections are kept below so old saved
* analytics rows still resolve readable topic labels. */
var TOPICS = {
Zoology: {
'Z1': 'Evolutionary Biology', 'Z2': 'Animal Diversity & Classification', 'Z3': 'Animal Tissues & Histology',
'Z4': 'Study of Selected Animals', 'Z5': 'Human Biology & Physiology', 'Z6': 'Microbial Diseases & Immunology',
'Z7': 'Medical Technology & Applied Biology', 'Z8': 'Biota, Environment & Conservation'
},
Botany: {
'B1': 'Basic Components of Life', 'B2': 'Biodiversity', 'B3': 'Ecology & Vegetation',
'B4': 'Cell Biology', 'B5': 'Genetics', 'B6': 'Plant Anatomy',
'B7': 'Plant Physiology', 'B8': 'Developmental Botany', 'B9': 'Applied Botany'
},
Chemistry: {
'C1': 'Physical Chemistry', 'C2': 'Inorganic Chemistry', 'C3': 'Organic Chemistry',
'C4': 'Applied Chemistry', 'C5': 'Analytical Chemistry'
},
Physics: {
'P1': 'Mechanics', 'P2': 'Heat & Thermodynamics', 'P3': 'Waves & Optics',
'P4': 'Current Electricity & Magnetism', 'P5': 'Electrostatics & Capacitors', 'P6': 'Modern Physics'
},
MAT: {
'A1': 'Verbal Reasoning', 'A2': 'Numerical Reasoning', 'A3': 'Logical Sequencing',
'A4': 'Spatial & Abstract Reasoning'
},
/* ---- legacy (pre-2026 syllabus) — display only ---- */
Biology: {
'Z1': 'Cell Biology (Zoology)', 'Z2': 'Human Physiology', 'Z3': 'Animal Diversity',
'Z4': 'Human Reproduction & Development', 'Z5': 'Genetics (Zoology)', 'Z6': 'Biochemistry & Biomolecules',
'Z7': 'Evolution & Adaptation', 'Z8': 'Applied Biology & Health', 'Z9': 'Animal Behaviour',
'B1': 'Plant Cell & Tissues', 'B2': 'Plant Physiology', 'B3': 'Plant Diversity',
'B4': 'Morphology & Anatomy', 'B5': 'Genetics & Biotech', 'B6': 'Ecology & Environment'
},
Mathematics: {
'M1': 'Algebra', 'M2': 'Trigonometry', 'M3': 'Coordinate Geometry',
'M4': 'Calculus', 'M5': 'Vectors', 'M6': 'Statistics & Probability',
'M7': 'Matrices & Determinants', 'M8': 'Sequence & Series', 'M9': 'Permutation & Combination'
}
};
/* Official exam blueprint (Group I): subject -> question count out of 200. */
var BLUEPRINT_RATIO = [['Zoology', 40], ['Botany', 40], ['Chemistry', 50], ['Physics', 50], ['MAT', 20]];
var SECONDS_PER_QUESTION = 54;
var MIN_EXAM_MINUTES = 10;
var LETTERS = ['A', 'B', 'C', 'D'];
var EXAM_DURATION_MINUTES = 60; /* safety fallback only (missing meta) */
var QUESTIONS_PER_EXAM = 20;
var MODEL_DEFAULT_COUNT_CLIENT = 20; /* default questions in the daily model exam */
var MODEL_HISTORY_DAYS_CLIENT = 7; /* days of daily-exam history returned */
var SESSION_HOURS = 24;

var SYLLABUS = {
meta: {
title: 'MECEE-BL Syllabus 2026',
revised: 'Third review — April 28, 2026',
authority: 'Government of Nepal · Medical Education Commission · Sanothimi, Bhaktapur',
history: '2020 syllabus · 1st rev. Mar 10 2021 · 2nd rev. Aug 18 2025 · 3rd rev. Apr 28 2026'
},
format: [
{ k: '200', label: 'MCQs — single best response (Type A), four options' },
{ k: '200', label: 'full marks · +1 correct · 0 skipped' },
{ k: '−0.25', label: 'deducted for each wrong response' },
{ k: '3 h', label: 'examination duration (54 s / question)' },
{ k: '50th', label: 'percentile rank = qualifying pass mark' },
{ k: '50:30:20', label: 'recall : understanding : application mix' }
],
groups: [
{
id: 'I', tag: 'MBBS · BDS',
name: 'MBBS, BDS, BSc Nursing / BSc Midwifery, BASLP & B. Perfusion Technology',
note: 'PCB weightage per unit below. The same PCB unit contents apply to every group (see the unit browser).',
rows: [
{ subject: 'Zoology', total: 40, units: [['Z1', 3], ['Z2', 4], ['Z3', 4], ['Z4', 6], ['Z5', 15], ['Z6', 4], ['Z7', 2], ['Z8', 2]] },
{ subject: 'Botany', total: 40, units: [['B1', 2], ['B2', 9], ['B3', 4], ['B4', 5], ['B5', 6], ['B6', 3], ['B7', 6], ['B8', 2], ['B9', 3]] },
{ subject: 'Chemistry', total: 50, units: [['C1', 17], ['C2', 10], ['C3', 17], ['C4', 3], ['C5', 3]] },
{ subject: 'Physics', total: 50, units: [['P1', 10], ['P2', 7], ['P3', 8], ['P4', 9], ['P5', 4], ['P6', 12]] },
{ subject: 'MAT', total: 20, units: [['A1', 5], ['A2', 5], ['A3', 5], ['A4', 5]] }
]
},
{
id: 'II', tag: 'BAMS · BSc MLT · B Pharm',
name: 'BAMS, BSc MLT, BSc MIT / BSc Radiotherapy Technology, BPT, B Pharm & B Optometry',
note: 'PCB is the same as Group I but with reduced Chemistry (40) and Physics (40), plus 20 questions from the PCL / diploma course of the specific subject.',
rows: [
{ subject: 'Zoology', total: 40, units: [['Z1', 3], ['Z2', 4], ['Z3', 4], ['Z4', 6], ['Z5', 15], ['Z6', 4], ['Z7', 2], ['Z8', 2]] },
{ subject: 'Botany', total: 40, units: [['B1', 2], ['B2', 9], ['B3', 4], ['B4', 5], ['B5', 6], ['B6', 3], ['B7', 6], ['B8', 2], ['B9', 3]] },
{ subject: 'Chemistry', total: 40, units: [['C1', 14], ['C2', 7], ['C3', 13], ['C4', 3], ['C5', 3]] },
{ subject: 'Physics', total: 40, units: [['P1', 8], ['P2', 6], ['P3', 6], ['P4', 7], ['P5', 3], ['P6', 10]] },
{ subject: 'PCL specific subject', total: 20, units: [['Contents from PCL / diploma level course of the specific subject', 20]] },
{ subject: 'MAT', total: 20, units: [['A1', 5], ['A2', 5], ['A3', 5], ['A4', 5]] }
]
},
{
id: 'III', tag: 'BPH',
name: 'BPH (Bachelor in Public Health)',
note: 'PCB as in Group II, plus 20 questions on Pre-requisite Health Knowledge instead of the PCL subject.',
rows: [
{ subject: 'Zoology', total: 40, units: [['Z1', 3], ['Z2', 4], ['Z3', 4], ['Z4', 6], ['Z5', 15], ['Z6', 4], ['Z7', 2], ['Z8', 2]] },
{ subject: 'Botany', total: 40, units: [['B1', 2], ['B2', 9], ['B3', 4], ['B4', 5], ['B5', 6], ['B6', 3], ['B7', 6], ['B8', 2], ['B9', 3]] },
{ subject: 'Chemistry', total: 40, units: [['C1', 14], ['C2', 7], ['C3', 13], ['C4', 3], ['C5', 3]] },
{ subject: 'Physics', total: 40, units: [['P1', 8], ['P2', 6], ['P3', 6], ['P4', 7], ['P5', 3], ['P6', 10]] },
{ subject: 'Pre-requisite Health Knowledge', total: 20, units: [['Determinants of health and illness', 5], ['Communicable diseases incl. vector-borne & zoonotic diseases', 5], ['Non-communicable diseases', 3], ['Water, sanitation and hygiene (WASH)', 2], ['Basic concept of biostatistics and epidemiology', 5]] },
{ subject: 'MAT', total: 20, units: [['A1', 5], ['A2', 5], ['A3', 5], ['A4', 5]] }
]
},
{
id: 'IV', tag: 'BNS · BMS',
name: 'BNS (Bachelor in Nursing Science) / BMS (Bachelor in Midwifery Science)',
note: 'Entry only from PCL nursing — 180 questions come from the PCL program itself. Full marks 200, same format and MAT.',
rows: [
{ subject: 'Core Subjects (PCL)', total: 150, units: [['Community health nursing', 25], ['Adults health nursing', 25], ['Child health nursing', 25], ['Midwifery and gynecological nursing', 25], ['Fundamental of nursing', 20], ['Leadership and management', 20], ['Behavioral science and mental health', 10]] },
{ subject: 'Basic & Integrated Health Science applied to Nursing', total: 30, units: [['Biochemistry', 5], ['Microbiology', 5], ['Pharmacology', 6], ['Anatomy', 7], ['Physiology', 7]] },
{ subject: 'MAT', total: 20, units: [['A1', 5], ['A2', 5], ['A3', 5], ['A4', 5]] }
]
}
],
pcb: {
Zoology: [
{ code: 'Z1', name: 'Evolutionary Biology', count: 3, content: 'Origin of life: Oparin-Haldane theory, Miller–Urey’s experiment; Evidences of evolution: morphological, anatomical, paleontological, embryological, biochemical; Theories: Lamarckism, Darwinism, Neo-Darwinism; Human evolution: from Ramapithecus to modern man.' },
{ code: 'Z2', name: 'Animal Diversity and Classification', count: 4, content: 'Diagnostic features and classification from Protozoa to Chordata.' },
{ code: 'Z3', name: 'Animal Tissues and Histology', count: 4, content: 'Epithelial, connective, muscular, nervous tissues — structure, location, function.' },
{ code: 'Z4', name: 'Study of Selected Animals', count: 6, content: 'Plasmodium — habitat, structure, life cycle, malaria types; Earthworm (Pheretima) — morphology, body systems, physiology, economic importance; Frog (Rana) — morphology, body systems and physiology.' },
{ code: 'Z5', name: 'Human Biology and Physiology', count: 15, content: 'Digestive system: alimentary canal and digestive glands, physiology of digestion; Respiratory system: respiratory organs, gas exchange and transport, regulation of respiration, respiratory disorders; Circulatory system: heart, cardiac cycle and output, heartbeat, arterial and venous system, blood group and pressure, cardiovascular disorders; Excretory system: excretory organs, urine formation, renal disorders; Nervous system: CNS, PNS and autonomic, nerve impulse; Sense organs: eye and ear; Endocrinology: glands, hormones and disorders; Reproductive system: organs, gametogenesis, ovarian and menstrual cycle.' },
{ code: 'Z6', name: 'Microbial Diseases and Immunology', count: 4, content: 'Diseases: typhoid, TB, HIV, cholera, influenza, hepatitis, candidiasis; Immunity: innate and acquired; antigens and antibodies; Vaccines: live attenuated, inactivated, toxoid.' },
{ code: 'Z7', name: 'Medical Technology and Applied Biology', count: 2, content: 'Tissue and organ transplantation, In-Vitro Fertilization (IVF), amniocentesis, transgenic animals; Applied microbiology: dairy/beverage microbes, sewage and drinking-water treatment, bio-control agents.' },
{ code: 'Z8', name: 'Biota, Environment and Conservation', count: 2, content: 'Animal behaviour: reflex actions, taxis and migration; Environmental pollution: air, water and soil pollution, pesticides; Adaptations: aquatic, terrestrial, volant; Conservation biology: biodiversity, protected areas, hotspots, Ramsar sites, IUCN categories, endangered species of Nepal.' }
],
Botany: [
{ code: 'B1', name: 'Basic Components of Life', count: 2, content: 'Structure, types and biological role of carbohydrates, lipids, proteins and minerals; structure, types and biological role of protein & enzymes.' },
{ code: 'B2', name: 'Biodiversity', count: 9, content: 'General concept of classification: 2-kingdom system, taxonomic hierarchies & binomial nomenclature, 5-kingdom system, 3-domain system; Monera & virus: bacterial cell structure, types, nutrition and growth, cyanobacteria, virus characteristics, structure, chemical composition, types; Fungi & lichens: Phycomycetes, Ascomycetes, Basidiomycetes, Deuteromycetes, yeast and Mucor structure & reproduction, lichen types; Algae: Chlorophyceae, Rhodophyceae, Phaeophyceae, Spirogyra structure & reproduction; Bryophytes: liverworts, hornworts, moss, Marchantia structure & reproduction; Pteridophytes: Dryopteris structure & reproduction; Gymnosperms: Pinus structure & reproduction; Angiosperms: morphology of root, stem, leaf, inflorescence, flower and fruit; diagnostic characters, floral formulae & diagrams of Brassicaceae, Solanaceae, Fabaceae, Liliaceae; Economic importance of virus, bacteria, blue-green algae, fungi, algae, bryophytes, pteridophytes, gymnosperms and angiosperms of Nepal; selected medicinal plants of Nepal: Neem, Sarpagandha, Yarsagumba, Tulasi, Ginger.' },
{ code: 'B3', name: 'Ecology and Vegetation', count: 4, content: 'Ecosystem ecology: structural and functional aspects of pond and forest ecosystems, biotic interactions; Biogeochemical cycles & ecological imbalances: carbon and nitrogen cycle, greenhouse effect, acid rain, ozone-layer depletion, climate change; Vegetation and adaptation: forest types of Nepal, biological invasion, ecological succession, hydrosere & xerosere.' },
{ code: 'B4', name: 'Cell Biology', count: 5, content: 'Prokaryotic and eukaryotic cells, cell theory; composition, structure and functions of cell wall, cell membrane, mitochondria, chloroplasts, ER, Golgi body, lysosome, ribosome, nucleus, chromosomes, cilia and flagella, cell inclusions; cell cycle: amitosis, mitosis and meiosis, cell division and its significance.' },
{ code: 'B5', name: 'Genetics', count: 6, content: 'Genetic material: composition, structure and functions of DNA and RNA, DNA replication, central dogma, genetic code; Mendelian genetics: terminology, laws of inheritance, incomplete dominance, co-dominance, linkage, crossing over; Sex-linked inheritance: patterns, colour blindness in humans, eye colour in Drosophila; Mutation & polyploidy: gene and chromosomal mutations, importance, polyploidy origin, types and significance; genetic disorders — Down’s, Turner’s, Edward’s, Klinefelter’s syndromes, albinism, hemophilia.' },
{ code: 'B6', name: 'Plant Anatomy', count: 3, content: 'Concept, characters, classification, structure and functions of plant tissues; types of vascular bundles; T.S. and L.S. of monocot and dicot root, stem and leaf.' },
{ code: 'B7', name: 'Plant Physiology', count: 6, content: 'Water relations: diffusion, diffusion pressure deficit, osmosis and its types, plasmolysis, osmotic pressure & potential, water potential, turgor and wall pressure; transpiration, ascent of sap, absorption, imbibition, guttation, wilting; Photosynthesis: significance, photosynthetic pigments, Photosystem I & II, light-dependent reactions, Calvin–Benson (C₃) cycle, Hatch–Slack (C₄) pathway, photorespiration, factors, bacterial photosynthesis; Respiration: aerobic & anaerobic mechanisms, glycolysis, oxidative decarboxylation, Krebs (TCA) cycle, electron transport system and oxidative phosphorylation, factors; Plant growth: roles of auxin, gibberellins and cytokinins, seed germination and types, seed dormancy.' },
{ code: 'B8', name: 'Developmental Botany', count: 2, content: 'Asexual reproduction, sporogenesis and gametogenesis in angiosperms, pollination and its types, fertilization, structure of monocot and dicot embryo, types and functions of endosperms.' },
{ code: 'B9', name: 'Applied Botany', count: 3, content: 'Plant tissue culture — introduction, concept, types and application; genetic engineering — introduction, concept and application; biofertilizers, green manures, plant breeding, bio-engineering, food safety and security.' }
],
Chemistry: [
{ code: 'C1', name: 'Physical Chemistry', count: 17, content: 'Basic concepts in chemistry: atoms, molecules, valency, relative atomic & molecular mass, amu, radicals, molecular & empirical formula, chemical equation, percentage composition; Stoichiometry: Dalton’s atomic theory, laws of stoichiometry, Avogadro’s law, mole concept, limiting reactants, percentage yield, numericals; Atomic structure: Rutherford & Bohr models, hydrogen spectrum, de-Broglie wave equation, Heisenberg uncertainty principle, orbitals, quantum numbers, Aufbau, Pauli exclusion, Hund’s rule, electronic configuration; Classification of elements & periodicity: modern periodic law and table, s/p/d/f blocks, isoelectronic species, periodic trends (atomic & ionic size, ionization potential, electronegativity, electron affinity, metallic character); Chemical bonding & shape of molecules: electronic theory of valency, ionic, covalent & co-ordinate bonds, Lewis dot structures, VSEPR shapes, Valence Bond Theory (sigma & pi), hybridization, dipole moment, ionic character, bond length, hydrogen bonding, metallic bond, van der Waals forces; Redox reactions: classical & electronic concepts, oxidation number, balancing (ion-electron method), applications; States of matter: gases (kinetic theory, gas laws, ideal & combined equations, real-gas deviation), liquids (vapour pressure, boiling point, surface tension, viscosity, liquid crystal, solutions & solubility curve), solids (crystalline & amorphous, efflorescence, deliquescence, hygroscopic, crystallization, water of crystallization, unit cell, 7 crystal systems & 14 Bravais lattices); Chemical equilibrium: physical & chemical, law of mass action, equilibrium constants, reaction quotient, Kp–Kc, Le-Chatelier’s principle; Volumetric analysis: equivalent weights, concentration (%, g/L, normality, molarity, molality, formality, ppm, ppb, mole fraction), primary & secondary standards, normality equation, numericals; Ionic equilibrium: Arrhenius, Bronsted-Lowry & Lewis acids/bases, Ostwald’s dilution law, ionic product of water, pKa/pKb/pH/pOH, common ion effect, solubility product, buffer solutions, salt hydrolysis, numericals; Chemical kinetics: rate, rate constant & units, order & molecularity, zero & first-order integrated rate laws and half-lives, collision theory, activation energy, catalysis, numericals; Electrochemistry: electrolytic cell, electrolysis, standard electrode potential, SHE, calomel electrode, electrochemical series, galvanic cell & emf, commercial cells, fuel cell, numericals; Thermodynamics: systems, state functions, internal energy, first law, enthalpy of reaction/solution/formation/combustion/neutralization/fusion/vaporization, Hess’s law, entropy, second law, Gibbs free energy & spontaneity, numericals; Nuclear chemistry: radioactivity, nuclear reactions, radioisotopes, radio-carbon dating.' },
{ code: 'C2', name: 'Inorganic Chemistry', count: 10, content: 'Chemistry of non-metals: hydrogen (atomic, molecular, nascent, isotopes, heavy water), types of oxides, ozone preparation/structure/test, ozone-layer depletion, ammonia, phosphine, nitric acid, chlorine, bromine, iodine, HCl/HBr/HI, allotropes of carbon, CO, H₂S, SO₂, H₂SO₄; Chemistry of metals: metallurgical principles (hydrometallurgy, pyrometallurgy, electrometallurgy; ores, gangue, flux, slag; concentration, calcination, roasting, smelting, bessemerization, aluminothermite, electrochemical reduction, poling, electro-refinement, zone refining), alkali & alkaline-earth metals, sodium, NaOH, Na₂CO₃, transition metals (3d series), complex-ion shapes, crystal field theory, copper, zinc, mercury, silver, iron, blue vitriol, white vitriol, calomel, corrosive sublimate, steel manufacture (BOP & open-hearth), corrosion of iron; Bio-inorganic chemistry: micro & macro nutrients, biological importance of Na, K, Mg, Zn, Cu, Co, Ni, Fe, Cr, Ca ions, Na-K & Na-glucose pump, toxicity of Fe, As, Hg, Pb, Cd.' },
{ code: 'C3', name: 'Organic Chemistry', count: 17, content: 'General organic chemistry: tetracovalency, catenation, classification, alkyl & aryl groups, functional groups, homologous series, IUPAC names, isomerism, bond fission, electrophiles, nucleophiles, carbocations, carbanions, free radicals, inductive & resonance effects; Hydrocarbons: cracking, pyrolysis, reforming, gasoline quality, octane & cetane numbers, additives; preparation & properties of alkanes, alkenes, alkynes; Aromatic hydrocarbons: aromaticity, resonance, benzene preparation & properties; Haloalkanes & haloarenes: nomenclature, preparation & properties, SN1 & SN2 mechanisms, chloroform, chlorobenzene; Alcohols & phenols: preparation & properties of monohydric alcohols, oxo-process, hydroboration-oxidation, fermentation, types of ethanol, phenol; Ethers: Williamson’s synthesis, diethyl ether; Aldehydes & ketones: preparation & properties of aliphatic carbonyls, benzaldehyde; Carboxylic acids & derivatives: monocarboxylic acids, acid halides, anhydrides, amides, esters & relative reactivity; Nitro-compounds: nitroalkanes, nitrobenzene; Amines: classification & isomerism, primary amines, basicity, Hoffmann separation of 1°/2°/3° amines, aniline; Organometallic compounds: organo-lithium, organo-copper, organo-cadmium, Grignard’s reagent.' },
{ code: 'C4', name: 'Applied Chemistry', count: 3, content: 'Fundamentals & manufacturing: chemical industry (importance, production stages), economical production & plant management, continuous vs batch processing, environmental effects & control, cement, paper & pulp; modern manufacture of nitric acid (Ostwald), ammonia (Haber), sulphuric acid (Contact), caustic soda (diaphragm cell), sodium carbonate (Solvay), urea (ammonium carbamate); Applications of non-metals, metals & compounds (hydrogen, oxygen, ozone, heavy water, H₂O₂, ammonia, nitric & sulphuric acids, hypo, halogens, sodium compounds, lime, bleaching powder, plaster of Paris, epsom & gypsum salts, copper & iron compounds, silver chloride & nitrate, organic families, formalin, chloropicrin, chloretone, Grignard’s reagent); Chemistry in service to mankind: polymers, dyes, drugs, pesticides, fertilizers, colloid & osmotic-pressure & buffer applications, radioisotopes in medicine & industry.' },
{ code: 'C5', name: 'Analytical Chemistry', count: 3, content: 'Chemical tests: acid & basic radicals, unsaturation & functional-group tests, distinction tests, hetero-element detection by Lassaigne’s test, biomolecule tests (fat, protein, carbohydrate); Separation techniques: filtration, sublimation, evaporation, precipitation, crystallization, distillation (simple, fractional, vacuum), paper chromatography, atmolysis; Types of titration: acid-base, redox (permanganometric, iodometric, iodimetric), complexometric, indicator selection.' }
],
Physics: [
{ code: 'P1', name: 'Mechanics', count: 10, content: 'Physical quantities, vectors & scalars: precision, accuracy, significant figures, dimensional analysis, vector & scalar laws and calculations; Kinematics: linear & projectile motion with and without resistive forces, graphical treatment; Dynamics: Newton’s laws & equilibrium, force, impulse, momentum, torque, work, energy & power, collisions, solid friction; Rotational dynamics: moment of inertia (uniform rod), radius of gyration, torque, work, energy & power in rotation; Fluid statics & dynamics: pressure, surface tension & energy, capillary action, Stokes’, Poiseuille’s & Bernoulli’s principles; Circular & periodic motion: centripetal force, SHM (period, frequency, displacement, amplitude, velocity, acceleration, restoring force, energy), forced oscillations; Gravity: gravitation force, acceleration, field strength, energy & potential; Elasticity: strain, stress, moduli of elasticity, Poisson ratio, energy density.' },
{ code: 'P2', name: 'Heat and Thermodynamics', count: 7, content: 'Thermal energy, heat, temperature & thermometers: modes & laws (zeroth law, Stefan-Boltzmann), liquid-in-glass, resistance & radiation thermometers; Thermal expansion: linear, cubical, superficial, real & apparent; Quantity of heat: heat capacity, specific heat, latent heats, triple point; Ideal gas: molecular properties, pressure/volume/temperature, rms speed, energy; First law of thermodynamics: adiabatic, isothermal, isochoric & isobaric processes; Second law: heat engines & refrigerators, entropy.' },
{ code: 'P3', name: 'Waves and Optics', count: 8, content: 'Wave motion: progressive waves, velocity of sound in solids, liquids & gases, affecting factors; Stationary waves: pipes & strings, harmonics & overtones; Acoustic phenomena: intensity, loudness, quality, pitch, Doppler effect; Reflection, refraction & dispersion: curved mirrors, plane surfaces, lenses, chromatic aberration, achromatism; Interference: conditions, Young’s double-slit experiment; Diffraction & polarization: single slit, grating, resolving power, Brewster’s law.' },
{ code: 'P4', name: 'Current Electricity and Magnetism', count: 9, content: 'Electrical quantities: Ohm’s & Joule’s laws, resistance, emf, p.d., energy, power; Electrical circuits: Kirchhoff’s laws, resistor combinations, Wheatstone & meter bridge, potentiometer, galvanometer conversions; Thermoelectric effect: Seebeck & Peltier effects, thermocouple; Alternating currents: peak & rms values, impedance, power, Q-factor, LRC phase, diode-bridge rectification; Magnetic properties: dia/para/ferromagnetic, domains, permeability, susceptibility, hysteresis; Magnetic field: B-field around conductors, coil & solenoid, force on moving charges & conductors, Hall effect; Electromagnetic induction: Faraday’s & Lenz’s laws, AC generator, transformer, eddy currents, self & mutual inductance, energy in inductors.' },
{ code: 'P5', name: 'Electrostatics and Capacitors', count: 4, content: 'Electric charge & field: point-charge fields, electrostatic induction, Coulomb’s law; Field strength, potential & potential energy: calculations, Gauss’s law & applications; Capacitors: principle, parallel-plate capacitor, combinations, energy density, dielectric effect.' },
{ code: 'P6', name: 'Modern Physics', count: 12, content: 'Nuclear physics: nucleus properties (charge, size, mass, density), mass defect, binding energy per nucleon, Einstein’s mass-energy relation, fusion & fission; Electron: motion in electric & magnetic fields, Millikan’s oil-drop, J.J. Thomson’s experiment; Photon: photo-electric effect; Wave-particle duality: Bohr’s hydrogen atom, spectral series, energy levels, de-Broglie waves, uncertainty principle, X-rays (production, properties, uses), Bragg’s law; Radioactivity: laws & units, alpha/beta/gamma properties, half-life & mean life, carbon dating, medical use & health hazard; Solid & semiconductor devices: energy bands, intrinsic & extrinsic semiconductors, p-n diode, biasing, rectifiers, logic gates (AND, OR, NOT, NOR, NAND); Particle physics & recent trends: particles, antiparticles, leptons, quarks, Higgs boson, nanotechnology, big-bang theory, Hubble law.' }
]
},
mat: [
{ code: 'A1', name: 'Verbal Reasoning', count: 5, content: 'Direction & distance sense, blood relations, coding-decoding, analogy, classification, statement reasoning.' },
{ code: 'A2', name: 'Numerical Reasoning', count: 5, content: 'Percentage, ratio & proportion, series completion, data interpretation, arithmetic reasoning.' },
{ code: 'A3', name: 'Logical Sequencing', count: 5, content: 'Number & letter series, ranking & ordering, sitting arrangement puzzles, syllogistic patterns.' },
{ code: 'A4', name: 'Spatial Relation / Abstract Reasoning', count: 5, content: '2-D nets & 3-D figures, mirror & water images, figure analogy, pattern completion, odd figure out.' }
],
samples: [
{ tag: 'General', q: 'Which one of the following drugs is approved by FDA for treatment of COVID-19?', opts: ['Remdesivir', 'Chloroquine', 'Azithromycin', 'Amoxicillin'], key: 'A', exp: 'Official MECEE-BL sample question (all programs).' },
{ tag: 'MAT · Verbal Reasoning', q: 'Rita goes 30 km towards North from a fixed point, then after turning to her right she goes 20 km. After this she goes 30 km after turning to her right. How far and in what direction is she from her starting point?', opts: ['10 km west', '15 km east', '20 km east', '30 km west'], key: 'C', exp: '30 N + 20 E + 30 S leaves her 20 km east of the start.' },
{ tag: 'MAT · Numerical Reasoning', q: 'The length and breadth are increased by 15% and 25% respectively. What is the percentage increase in the area of the rectangle?', opts: ['20%', '30%', '40%', '44%'], key: 'D', exp: 'New area factor = 1.15 × 1.25 = 1.4375 → 43.75% ≈ 44%.' },
{ tag: 'MAT · Logical Sequencing', q: 'Look at this series: 53, 53, 40, 40, 27, 27, … Which pair of numbers should come next?', opts: ['12', '14', '27', '53'], key: 'B', exp: 'The series repeats each value once and drops by 13: 27 − 13 = 14.' }
]
};

var CIRCUIT_SVG = "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='170' viewBox='0 0 300 170'><rect width='300' height='170' rx='12' fill='#11131f'/><g stroke='#e6e9f2' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'><path d='M95 50 H115'/><path d='M175 50 H235 V130 H95 V112'/><path d='M95 88 V50'/></g><path d='M115 50 L122 39 L131 61 L140 39 L149 61 L158 39 L167 50' stroke='#4f7cff' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/><line x1='79' y1='100' x2='111' y2='100' stroke='#e6e9f2' stroke-width='4' stroke-linecap='round'/><line x1='87' y1='87' x2='103' y2='87' stroke='#e6e9f2' stroke-width='2.5' stroke-linecap='round'/><text x='14' y='97' fill='#e6e9f2' font-family='Arial,Helvetica,sans-serif' font-size='14'>12 V</text><text x='115' y='24' fill='#4f7cff' font-family='Arial,Helvetica,sans-serif' font-size='14'>4 \u03A9</text><g><line x1='262' y1='75' x2='262' y2='105' stroke='#ffb020' stroke-width='2.5'/><path d='M255 98 L262 112 L269 98 Z' fill='#ffb020'/></g><text x='272' y='92' fill='#ffb020' font-family='Arial,Helvetica,sans-serif' font-size='14'>I</text></svg>";

var FALLBACK_CLIENT = [
{ section: 'Zoology', topic: 'Z5', question: 'Which chamber of the human heart pumps oxygenated blood to the entire body?', A: 'Right atrium', B: 'Right ventricle', C: 'Left atrium', D: 'Left ventricle', answer: 'D', explanation: 'The left ventricle has the thickest muscular wall because it must generate enough pressure to push oxygenated blood through the aorta to the whole body (systemic circulation).', image: '', difficulty: 'easy' },
{ section: 'Botany', topic: 'B7', question: 'In which cell organelle does photosynthesis primarily occur?', A: 'Mitochondria', B: 'Chloroplast', C: 'Ribosome', D: 'Lysosome', answer: 'B', explanation: 'Chloroplasts contain chlorophyll, the green pigment that captures light energy and converts it into chemical energy (glucose) during photosynthesis.', image: '', difficulty: 'easy' },
{ section: 'Zoology', topic: 'Z6', question: 'Which one of the following drugs is approved by FDA for treatment of COVID-19?', A: 'Remdesivir', B: 'Chloroquine', C: 'Azithromycin', D: 'Amoxicillin', answer: 'A', explanation: 'Remdesivir was the first drug to receive FDA approval for the treatment of COVID-19. (Official MECEE-BL sample question.)', image: '', difficulty: 'medium' },
{ section: 'Chemistry', topic: 'C1', question: 'What is the maximum number of electrons that can be accommodated in the second shell (n = 2) of an atom?', A: '2', B: '8', C: '18', D: '32', answer: 'B', explanation: 'The maximum number of electrons in a shell is given by 2n². For n = 2: 2 × (2)² = 8 electrons.', image: '', difficulty: 'medium' },
{ section: 'Chemistry', topic: 'C1', question: 'Which type of chemical bond is formed by the transfer of electrons from one atom to another?', A: 'Covalent bond', B: 'Ionic bond', C: 'Metallic bond', D: 'Hydrogen bond', answer: 'B', explanation: 'Ionic (electrovalent) bonds form when one atom transfers electrons to another, producing oppositely charged ions that attract each other — e.g. Na⁺Cl⁻.', image: '', difficulty: 'medium' },
{ section: 'Physics', topic: 'P1', question: 'The SI unit of force is:', A: 'Joule', B: 'Watt', C: 'Newton', D: 'Pascal', answer: 'C', explanation: 'Force = mass × acceleration (F = ma). In SI units, kg·m/s² is defined as the newton (N), named after Sir Isaac Newton.', image: '', difficulty: 'easy' },
{ section: 'Physics', topic: 'P4', question: 'In the circuit shown, a 12 V battery is connected across a 4 \u03A9 resistor. What is the current flowing through the circuit?', A: '2 A', B: '3 A', C: '4 A', D: '48 A', answer: 'B', explanation: 'By Ohm’s law, I = V / R = 12 V ÷ 4 \u03A9 = 3 A. The current flows clockwise as marked (I).', image: 'data:image/svg+xml;utf8,' + encodeURIComponent(CIRCUIT_SVG), difficulty: 'hard' },
{ section: 'MAT', topic: 'A1', question: 'Rita goes 30 km towards North from a fixed point, then after turning to her right she goes 20 km. After this she goes 30 km after turning to her right. How far and in what direction is she from her starting point?', A: '10 km west', B: '15 km east', C: '20 km east', D: '30 km west', answer: 'C', explanation: '30 km North + 20 km East + 30 km South brings her 20 km East of the starting point. (Official MECEE-BL MAT sample question.)', image: '', difficulty: 'medium' },
{ section: 'MAT', topic: 'A2', question: 'The length and breadth of a rectangle are increased by 15% and 25% respectively. What is the percentage increase in the area of the rectangle?', A: '20%', B: '30%', C: '40%', D: '44%', answer: 'D', explanation: 'New area factor = 1.15 × 1.25 = 1.4375, so the area increases by 43.75% ≈ 44%. (Official MECEE-BL MAT sample question.)', image: '', difficulty: 'medium' },
{ section: 'MAT', topic: 'A3', question: 'Look at this series: 53, 53, 40, 40, 27, 27, … Which pair of numbers should come next?', A: '12', B: '14', C: '27', D: '53', answer: 'B', explanation: 'Each value appears twice, then drops by 13: 27 − 13 = 14, so the next pair is 14, 14. (Official MECEE-BL MAT sample question.)', image: '', difficulty: 'medium' }
];

/* ---------------- 2. utilities ---------------- */
function $(id) { return document.getElementById(id); }
function esc(s) {
return String(s == null ? '' : s)
.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function norm(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
function fmtScore(v) {
var n = Math.round(num(v) * 100) / 100;
var s = n.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
return n === 0 && 1 / n === -Infinity ? '0' : s;
}
function fmtDate(ts) {
var d = new Date(ts);
if (isNaN(d.getTime())) return String(ts || '');
return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) +
' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
function mmss(ms) {
var s = Math.max(0, Math.floor(ms / 1000));
var m = Math.floor(s / 60); s = s % 60;
return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}
function topicLabel(section, topic) {
var t = TOPICS[section] || {};
var code = String(topic || '').trim();
if (!code) return '';
return t[code] ? code + ' · ' + t[code] : code;
}
function diffBadge(d) {
var v = normalizeDifficultyClient(d);
var label = v.charAt(0).toUpperCase() + v.slice(1);
return '<span class="badge diff diff-' + v + '" title="Question difficulty: ' + label + '">' + label + '</span>';
}
function deviceId() {
var k = 'cee_device_id';
var v = null;
try { v = localStorage.getItem(k); } catch (e) {}
if (!v) {
v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() :
'dev-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
try { localStorage.setItem(k, v); } catch (e) {}
}
return v;
}
function loadJSON(key, fallback) {
try {
var raw = localStorage.getItem(key);
return raw ? JSON.parse(raw) : fallback;
} catch (e) { return fallback; }
}
function saveJSON(key, val) {
try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {
toast('Could not save locally (storage full?)', 'error');
}
}
function delJSON(key) { try { localStorage.removeItem(key); } catch (e) {} }
var LS = { session: 'cee_session', exam: 'cee_active_exam', db: 'cee_mock_db_v1' };
var ICONS = {
check: '<svg class="mark" viewBox="0 0 24 24" fill="none"><path d="M4 12.5 9 17.5 20 6.5" stroke="#2ecc71" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
cross: '<svg class="mark" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="#ff5c6c" stroke-width="3" stroke-linecap="round"/></svg>',
eye: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>',
trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
mail: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="m3 7 9 6 9-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
arrowR: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
upload: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0 5 5m-5-5-5 5M4 20h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
wand: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="m5 19 9-9m0 0 3-3-2-2-3 3m2 2-2-2M15 5l1-1m2 4 1-1M19 9h1M5 13l-1 1m1-5-1-1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
function toast(msg, type, ms) {
type = type || 'info';
var box = $('toasts');
var el = document.createElement('div');
el.className = 'toast ' + type;
var glyph = type === 'success' ? ICONS.check : type === 'error' ? ICONS.cross :
type === 'warn' ? '<svg class="t-ic" viewBox="0 0 24 24" fill="none"><path d="M12 8v5m0 3.5v.01M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="#ffb020" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' :
'<svg class="t-ic" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#6b93ff" stroke-width="2"/><path d="M12 8v5m0 3.5v.01" stroke="#6b93ff" stroke-width="2" stroke-linecap="round"/></svg>';
el.innerHTML = glyph + '<div>' + esc(msg) + '</div>';
el.addEventListener('click', function () { dismiss(); });
box.appendChild(el);
var t = setTimeout(dismiss, ms || 4200);
function dismiss() {
clearTimeout(t);
if (!el.parentNode) return;
el.classList.add('out');
setTimeout(function () { el.remove(); }, 250);
}
}
var _loadCount = 0;
function showLoading(text) {
_loadCount++;
 $('loadingText').textContent = text || 'Working…';
 $('loadingOverlay').classList.remove('hidden');
}
function hideLoading() {
_loadCount = Math.max(0, _loadCount - 1);
if (_loadCount === 0) $('loadingOverlay').classList.add('hidden');
}
function parseErr(e) {
var msg = (e && e.message) ? String(e.message) : String(e || 'Something went wrong');
var m = msg.match(/^([A-Z_]+):([\s\S]*)$/);
if (m) return { code: m[1], message: m[2] };
return { code: '', message: msg };
}
function handleErr(e, fallback) {
var p = parseErr(e);
if (p.code === 'SESSION_INVALID' || p.code === 'SESSION_EXPIRED') {
forceLogout('Your session has expired (24-hour limit). Please log in again.');
return;
}
toast(p.message || fallback || 'Something went wrong', 'error');
}
var _confirmResolve = null;
function confirmDialog(opts) {
return new Promise(function (resolve) {
_confirmResolve = resolve;
 $('cfTitle').textContent = opts.title || 'Confirm';
var okBtn = $('btnCfOk');
okBtn.textContent = opts.okText || 'Confirm';
okBtn.className = 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary');
var body = $('cfBody');
body.innerHTML = (opts.html || esc(opts.body || ''));
openModal('modalConfirm');
});
}
function _confirmDone(val) {
if (_confirmResolve) { _confirmResolve(val); _confirmResolve = null; }
closeModal('modalConfirm');
}
function openModal(id) {
 $(id).classList.remove('hidden');
var first = $(id).querySelector('button, input, select, textarea, [tabindex]');
if (first) setTimeout(function () { first.focus(); }, 60);
}
function closeModal(id) { $(id).classList.add('hidden'); }

/* ---------------- 3. simulated backend (preview mode only) ---------------- */
function mockSha256(str) {
var h = 0;
for (var i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
var seed = Math.abs(h) + 123456789;
var out = '';
var x = seed;
for (var j = 0; j < 64; j++) {
x = (x * 1103515245 + 12345) & 0x7fffffff;
out += (x % 16).toString(16);
}
return out;
}
function mulberry32(seed) {
var a = seed >>> 0;
return function () {
a |= 0; a = (a + 0x6D2B79F5) | 0;
var t = Math.imul(a ^ (a >>> 15), 1 | a);
t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
}
function seededShuffle(arr, seedStr) {
var h = 2166136261;
for (var i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
var rnd = mulberry32(h >>> 0);
var a = arr.slice();
for (var k = a.length - 1; k > 0; k--) {
var j = Math.floor(rnd() * (k + 1));
var tmp = a[k]; a[k] = a[j]; a[j] = tmp;
}
return a;
}
function buildExamSetClient(bank, userId, attemptIndex, opts) {
var seed = 'exam|' + String(userId) + '|' + String(attemptIndex) + '|' + examOptsSignatureClient(opts);
var take = opts && opts.mode === 'practice' ? Math.max(1, Math.min(100, num(opts.count) || 10)) : QUESTIONS_PER_EXAM;
take = Math.min(take, bank.length);
var isPractice = opts && opts.mode === 'practice';
var diffFilter = isPractice && opts.difficulties && opts.difficulties.length && opts.difficulties.length < 3;
var chosen = isPractice
? (diffFilter
? seededShuffle(bank, seed).slice(0, take)
: weightedExamPickClient(bank, take, seed))
: blueprintExamPickClient(bank, take, seed);
return seededShuffle(chosen, seed + '|order');
}
function blueprintExamPickClient(bank, take, seed) {
var keys = BLUEPRINT_RATIO.map(function (p) { return p[0]; });
var total = BLUEPRINT_RATIO.reduce(function (a, p) { return a + p[1]; }, 0);
var pools = {}, inBlueprint = {};
keys.forEach(function (k) { pools[k] = []; });
bank.forEach(function (q) {
var s = String(q.section || '').trim();
if (pools[s]) { pools[s].push(q); inBlueprint[q] = true; }
});
var legacy = bank.filter(function (q) { return !inBlueprint[q]; });
var picked = [];
BLUEPRINT_RATIO.forEach(function (pair, i) {
var want = Math.round(take * pair[1] / total);
picked = picked.concat(weightedExamPickClient(pools[pair[0]], want, seed + '|bp' + i));
});
if (picked.length > take) {
picked = seededShuffle(picked, seed + '|trim').slice(0, take);
} else if (picked.length < take) {
var leftovers = [].concat(legacy, bank.filter(function (q) { return picked.indexOf(q) < 0; }));
picked = picked.concat(weightedExamPickClient(leftovers, take - picked.length, seed + '|fill'));
}
return picked;
}
function weightedExamPickClient(bank, take, seed) {
var groups = { easy: [], medium: [], hard: [] };
bank.forEach(function (q) {
var d = normalizeDifficultyClient(q.difficulty);
groups[d].push(q);
});
var nEasy = Math.round(take * 0.2);
var nHard = Math.round(take * 0.2);
var nMed = Math.max(0, take - nEasy - nHard);
function takeFrom(key, n, subSeed) {
var pool = seededShuffle(groups[key], seed + '|' + subSeed);
var picked = pool.slice(0, n);
picked.forEach(function (q) {
groups[key] = groups[key].filter(function (x) { return x !== q; });
});
return picked;
}
var picked = [].concat(takeFrom('easy', nEasy, 'e'), takeFrom('medium', nMed, 'm'), takeFrom('hard', nHard, 'h'));
if (picked.length < take) {
var rest = [].concat(groups.easy, groups.medium, groups.hard);
picked = picked.concat(seededShuffle(rest, seed + '|r').slice(0, take - picked.length));
}
return picked;
}
function normalizeExamOptionsClient(options) {
var o = options || {};
if (o.mode !== 'practice') return { mode: 'mock' };
var subjects = [];
if (Array.isArray(o.subjects)) {
o.subjects.forEach(function (s) {
var v = String(s || '').trim();
if (v && subjects.indexOf(v) < 0) subjects.push(v);
});
}
var topics = [];
if (Array.isArray(o.topics)) {
o.topics.forEach(function (t) {
var v = String(t || '').trim();
if (v && topics.indexOf(v) < 0) topics.push(v);
});
}
var difficulties = [];
if (Array.isArray(o.difficulties)) {
o.difficulties.forEach(function (d) {
var v = normalizeDifficultyClient(d);
if (difficulties.indexOf(v) < 0) difficulties.push(v);
});
}
if (!difficulties.length) difficulties = ['easy', 'medium', 'hard'];
return {
mode: 'practice',
subjects: subjects,
topics: topics,
difficulties: difficulties,
count: Math.max(1, Math.min(100, num(o.count) || 10)),
timed: o.timed !== false,
minutes: Math.max(1, Math.min(180, num(o.minutes) || 15)),
negMarking: o.negMarking !== false,
instantFeedback: !!o.instantFeedback
};
}
function examOptsSignatureClient(opts) {
if (!opts || opts.mode !== 'practice') return 'mock';
return ['practice',
(opts.subjects || []).slice().sort().join(','),
(opts.topics || []).slice().sort().join(','),
(opts.difficulties || ['easy', 'medium', 'hard']).slice().sort().join(','),
num(opts.count), opts.timed ? 1 : 0, num(opts.minutes),
opts.negMarking === false ? 0 : 1, opts.instantFeedback ? 1 : 0
].join('|');
}
function filterBankForPracticeClient(bank, opts) {
var out = bank;
if (opts.subjects && opts.subjects.length) {
out = out.filter(function (q) { return opts.subjects.indexOf(String(q.section || '').trim()) >= 0; });
}
if (opts.topics && opts.topics.length) {
out = out.filter(function (q) { return opts.topics.indexOf(String(q.topic || '').trim()) >= 0; });
}
if (opts.difficulties && opts.difficulties.length && opts.difficulties.length < 3) {
out = out.filter(function (q) { return opts.difficulties.indexOf(normalizeDifficultyClient(q.difficulty)) >= 0; });
}
return out;
}
var MockDB = {
load: function () {
var db = loadJSON(LS.db, null);
if (!db) { db = MockDB.seed(); saveJSON(LS.db, db); }
return db;
},
save: function (db) { saveJSON(LS.db, db); },
reset: function () { delJSON(LS.db); },
seed: function () {
var db = {
users: [], attempts: [], responses: [], questions: FALLBACK_CLIENT.map(function (q) {
return { section: q.section, topic: q.topic, question: q.question, A: q.A, B: q.B, C: q.C, D: q.D, answer: q.answer, explanation: q.explanation, image: q.image, difficulty: q.difficulty || 'medium' };
}), emails: [], messages: [], nextId: 1
};
function mkUser(name, email, username, pw, role, status) {
var u = { id: 'U' + (1000 + db.nextId++), name: name, email: email, username: username, password: mockSha256(pw), role: role, status: status, deviceId: '', sessionToken: '', sessionExpiry: 0, createdAt: new Date(Date.now() - 86400000 * 30).toISOString() };
db.users.push(u); return u;
}
var teacher = mkUser('Demo Teacher', 'teacher@cee.edu', 'demoteacher', 'demo1234', 'teacher', 'approved');
var student = mkUser('Demo Student', 'student@cee.edu', 'demostudent', 'demo1234', 'student', 'approved');
mkUser('Pending Student', 'pending@cee.edu', 'pendingstudent', 'demo1234', 'student', 'pending');
var aayush = mkUser('Aayush Karki', 'aayush@cee.edu', 'aayushk', 'demo1234', 'student', 'approved');
var sabina = mkUser('Sabina Gurung', 'sabina@cee.edu', 'sabinag', 'demo1234', 'student', 'approved');
var today = clientTodayStr();
db.daily = { exams: [], auto: { enabled: true, hour: 20 } };
var modelRow = mockWriteDailyRow(db, today, 'System (autopilot)', MODEL_DEFAULT_COUNT_CLIENT, true, null);
modelRow.generatedAt = new Date(Date.now() - 86400000 - 3600000 * 3).toISOString();
var pastRow = mockWriteDailyRow(db, clientDateAddDays(today, -3), 'System (autopilot)', MODEL_DEFAULT_COUNT_CLIENT, true, null);
pastRow.generatedAt = new Date(Date.now() - 4 * 86400000).toISOString();
function synthAttempt(user, daysAgo, seedNum, nQuestions, bias, sectionFilter, isPractice, isModel, modelDate) {
var ts = new Date(Date.now() - daysAgo * 86400000).toISOString();
var rnd = mulberry32(seedNum);
var pool = sectionFilter ? db.questions.filter(function (q) { return sectionFilter.indexOf(q.section) >= 0; }) : db.questions;
if (isModel) {
var mrow = mockFindDailyRow(db, modelDate);
var mset = mrow ? mockResolveModelSet(db, mrow).set : [];
pool = mset;
}
var set = pool.slice(0, Math.min(nQuestions, pool.length));
var correct = 0, wrong = 0, skipped = 0, score = 0;
var secCounts = {};
set.forEach(function (q, idx) {
var r = rnd();
var chosen = '';
if (r < bias) { chosen = q.answer; }
else if (r < bias + (1 - bias) * 0.65) {
var wrongs = LETTERS.filter(function (L) { return L !== q.answer; });
chosen = wrongs[Math.floor(rnd() * wrongs.length)];
}
var was = 0;
if (chosen) {
if (chosen === q.answer) { was = 1; correct++; score += 1; }
else { was = -1; wrong++; if (!isPractice) score -= 0.25; }
} else skipped++;
secCounts[q.section] = (secCounts[q.section] || 0) + 1;
db.responses.push({ timestamp: ts, userId: user.id, itemIndex: idx, question: q.question, topic: q.topic, chosenLetter: chosen, correctLetter: q.answer, wasCorrect: was, explanation: q.explanation, image: q.image });
});
var total = set.length;
db.attempts.push({
timestamp: ts, userId: user.id, userName: user.name, email: user.email,
score: Math.round(score * 100) / 100, totalQuestions: total, correct: correct, wrong: wrong,
skipped: skipped, accuracy: Math.round((correct / total) * 1000) / 10,
section: (isModel ? 'MODEL|' + modelDate + '|' : isPractice ? 'PRACTICE|' : '') + Object.keys(secCounts).map(function (s) { return s + ':' + secCounts[s]; }).join(' | '),
detailCount: total
});
}
synthAttempt(student, 3, 11, 8, 0.55, null, false);
synthAttempt(student, 7, 41, 8, 0.55, null, false);
synthAttempt(student, 1, 77, 4, 0.75, ['Zoology', 'Botany'], true);
synthAttempt(aayush, 2, 23, 8, 0.8, null, false);
synthAttempt(aayush, 5, 87, 8, 0.65, null, false);
synthAttempt(sabina, 4, 19, 8, 0.45, null, false);
synthAttempt(aayush, 0, 131, 99, 0.7, null, false, true, today);
synthAttempt(sabina, 0, 173, 99, 0.5, null, false, true, today);
synthAttempt(aayush, 3, 137, 99, 0.6, null, false, true, clientDateAddDays(today, -3));
synthAttempt(sabina, 3, 179, 99, 0.45, null, false, true, clientDateAddDays(today, -3));
db.emails.push({
to: 'teacher@cee.edu', subject: 'CEE Mock Portal — New registration pending approval',
html: '<div style="font-family:Arial,sans-serif;padding:20px"><h3>New registration</h3><p><b>Pending Student</b> (pending@cee.edu) has registered as a student and is awaiting your approval.</p></div>'
});
db.messages.push({
timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
fromId: student.id, fromName: student.name, fromEmail: student.email, fromRole: 'student',
toId: '', toRole: 'teacher', subject: 'Question about C1 Atomic Structure',
body: 'Namaste sir/ma’am,\nI keep confusing the 2n² rule with the octet exception in the third shell. Could you add a few practice questions on shells 3 and 4 to the bank, or suggest which micro-topic code covers them?\nThank you!',
readAt: ''
});
db.messages.push({
timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
fromId: teacher.id, fromName: teacher.name, fromEmail: teacher.email, fromRole: 'teacher',
toId: student.id, toRole: 'student', subject: 'Message from your teacher',
body: 'Great progress on your last mock — your Zoology accuracy is climbing nicely. Keep drilling the weak topics listed on your dashboard before Friday’s test.',
readAt: new Date(Date.now() - 86400000).toISOString()
});
return db;
}
};
function mockSendMail(db, to, subject, html) {
db.emails.unshift({ to: to, subject: subject, html: html, at: new Date().toISOString() });
if (db.emails.length > 30) db.emails.length = 30;
}
function mockRequireSession(db, userId, token, role) {
var u = null;
db.users.forEach(function (x) { if (String(x.id) === String(userId)) u = x; });
if (!u || u.sessionToken !== String(token)) throw new Error('SESSION_INVALID:Please log in again.');
if (Date.now() > num(u.sessionExpiry)) throw new Error('SESSION_EXPIRED:Your 24-hour session has expired. Log in again.');
if (u.status !== 'approved') throw new Error('SESSION_INVALID:Account is not approved.');
if (role && u.role !== role) throw new Error('FORBIDDEN:This action requires a teacher account.');
return u;
}
function mockScoreItem(q, idx, chosen) {
var was = 0;
if (chosen) was = (chosen === String(q.answer).toUpperCase()) ? 1 : -1;
return {
itemIndex: idx, section: q.section, topic: q.topic, question: q.question,
options: [q.A, q.B, q.C, q.D], chosenLetter: chosen || '',
correctLetter: String(q.answer || '').toUpperCase(), wasCorrect: was,
explanation: q.explanation || '', image: q.image || '',
difficulty: normalizeDifficultyClient(q.difficulty)
};
}
function normalizeDifficultyClient(v) {
var d = norm(v);
if (d === 'e' || d === 'easy') return 'easy';
if (d === 'h' || d === 'hard' || d === 'difficult') return 'hard';
return 'medium';
}
function clientTodayStr() {
var d = new Date();
return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function clientDateAddDays(dateStr, n) {
var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr));
if (!m) return String(dateStr);
var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
d.setDate(d.getDate() + n);
return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function mockDailyRows(db) {
return (db.daily && db.daily.exams ? db.daily.exams : []).map(function (r) {
return {
date: String(r.date || ''), status: String(r.status || 'ready'),
questionCount: num(r.questionCount), generatedBy: String(r.generatedBy || ''),
generatedAt: String(r.generatedAt || ''), salt: num(r.salt), auto: !!r.auto,
texts: Array.isArray(r.questions) ? r.questions : []
};
});
}
function mockFindDailyRow(db, dateStr) {
var hit = null;
mockDailyRows(db).forEach(function (r) { if (r.date === String(dateStr) && !hit) hit = r; });
return hit;
}
function mockModelAttempts(db, dateStr) {
var prefix = 'MODEL|' + dateStr;
return db.attempts.filter(function (a) {
var s = String(a.section || '');
return s.indexOf(prefix) === 0;
});
}
function mockModelAttemptsFor(db, dateStr, userId) {
return mockModelAttempts(db, dateStr).filter(function (a) { return String(a.userId) === String(userId); });
}
function mockResolveModelSet(db, row) {
var bank = db.questions.length ? db.questions : FALLBACK_CLIENT;
var byText = {};
bank.forEach(function (q) {
var k = norm(q.question);
if (!(k in byText)) byText[k] = q;
});
var out = [];
row.texts.forEach(function (t) {
var q = byText[norm(t)];
if (q) out.push(q);
});
return { set: out, missing: row.texts.length - out.length };
}
function mockDailyLeaderboard(db, dateStr, meId) {
var usersById = {};
db.users.forEach(function (u) { usersById[String(u.id)] = u; });
var rows = mockModelAttempts(db, dateStr).map(function (a) {
var u = usersById[String(a.userId)] || {};
return {
userId: String(a.userId), name: String(u.name || a.userName || 'Student'),
score: num(a.score), total: num(a.totalQuestions), accuracy: num(a.accuracy),
submittedAt: String(a.timestamp || ''), isMe: String(a.userId) === String(meId)
};
});
rows.sort(function (x, y) {
return y.score - x.score || y.accuracy - x.accuracy ||
(x.submittedAt < y.submittedAt ? -1 : x.submittedAt > y.submittedAt ? 1 : 0);
});
rows.forEach(function (r, i) { r.rank = i + 1; });
return rows;
}
function mockDailyPreviewItems(db, row) {
return mockResolveModelSet(db, row).set.map(function (q, i) {
return {
n: i + 1, section: q.section, topic: q.topic, question: q.question,
A: q.A, B: q.B, C: q.C, D: q.D, answer: String(q.answer || '').toUpperCase(),
difficulty: normalizeDifficultyClient(q.difficulty), image: q.image || ''
};
});
}
function mockWriteDailyRow(db, dateStr, byName, count, auto, prevRow) {
var bank = db.questions.length ? db.questions : FALLBACK_CLIENT;
var salt = prevRow ? num(prevRow.salt) + 1 : 0;
var take = Math.max(1, Math.min(count || MODEL_DEFAULT_COUNT_CLIENT, bank.length));
var picked = blueprintExamPickClient(bank, take, 'model|' + dateStr + '|' + salt);
var texts = picked.map(function (q) { return q.question; });
if (!db.daily) db.daily = { exams: [], auto: { enabled: false, hour: 20 } };
if (!db.daily.exams) db.daily.exams = [];
var row = {
date: dateStr, status: 'ready', questionCount: texts.length, generatedBy: byName,
generatedAt: new Date().toISOString(), salt: salt, auto: !!auto, questions: texts,
texts: texts
};
if (prevRow) {
var i = db.daily.exams.indexOf(prevRow);
if (i < 0) i = db.daily.exams.findIndex(function (r) { return r.date === dateStr; });
if (i >= 0) db.daily.exams[i] = row; else db.daily.exams.push(row);
} else {
db.daily.exams.push(row);
}
return row;
}
function mockAutopilotTick(db) {
if (!db.daily || !db.daily.auto || !db.daily.auto.enabled) return;
var tomorrow = clientDateAddDays(clientTodayStr(), 1);
var prev = mockFindDailyRow(db, tomorrow);
if (prev && prev.status === 'ready') return;
mockWriteDailyRow(db, tomorrow, 'System (autopilot)', MODEL_DEFAULT_COUNT_CLIENT, true, prev);
MockDB.save(db);
}
function mockModelLockedTexts(db) {
var locked = {};
var today = clientTodayStr();
mockDailyRows(db).forEach(function (r) {
if (r.status !== 'ready' || !r.date || r.date < today) return;
r.texts.forEach(function (t) { locked[norm(t)] = true; });
});
return locked;
}
function modelReadyEmailHtml(name, date, count) {
return '<div style="font-family:Arial,sans-serif;padding:20px"><h3>Model exam of ' + esc(date) + '</h3>' +
'<p>Hi ' + esc(name) + ',</p><p>A model exam with <b>' + count + ' questions</b> has been scheduled for <b>' + esc(date) + '</b>.</p>' +
'<p>Everyone takes the <b>same questions in the same order</b> — one attempt each, full CEE marking (+1 correct · −0.25 wrong · 0 skipped).</p></div>';
}
function clientEmailHtml(name, r) {
var rows = r.items.map(function (it) {
var chip = it.wasCorrect === 1 ? '<span style="color:#2e7d32;font-weight:bold">&#10003; Correct</span>' :
it.wasCorrect === -1 ? '<span style="color:#c62828;font-weight:bold">&#10007; Wrong</span>' :
'<span style="color:#757575;font-weight:bold">&#8212; Skipped</span>';
return '<tr style="border-bottom:1px solid #eee"><td style="padding:10px 8px;vertical-align:top">' +
'<b>Q' + (it.itemIndex + 1) + '</b><br>' + esc(it.question) +
(it.image ? '<br><img src="' + esc(it.image) + '" style="max-width:280px;border-radius:6px;margin-top:6px">' : '') +
'</td><td style="padding:10px 8px">' + esc(it.chosenLetter || '—') + '</td><td style="padding:10px 8px">' + esc(it.correctLetter) + '</td><td style="padding:10px 8px;white-space:nowrap">' + chip + '</td></tr>' +
(it.explanation ? '<tr><td colspan="4" style="padding:4px 8px 14px;color:#555;font-size:12.5px"><i>Explanation:</i> ' + esc(it.explanation) + '</td></tr>' : '');
}).join('');
return '<div style="background:#0f1220;padding:24px;font-family:Arial,sans-serif"><div style="max-width:640px;margin:auto;background:#fff;border-radius:12px;overflow:hidden">' +
'<div style="background:#4f7cff;color:#fff;padding:16px 24px;font-size:18px;font-weight:bold">CEE Mock Portal</div>' +
'<div style="padding:24px;color:#222"><p>Hi ' + esc(name) + ',</p><p>Your ' + (r.practice ? 'practice session' : 'mock test') + ' has been scored:</p>' +
'<p style="font-size:26px;font-weight:bold;color:#4f7cff">' + fmtScore(r.score) + ' / ' + r.total + ' (' + r.accuracy + '%)</p>' +
'<p>Correct: <b>' + r.correct + '</b> · Wrong: <b>' + r.wrong + '</b> · Skipped: <b>' + r.skipped + '</b></p>' +
'<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f5f5f5"><th align="left" style="padding:8px">Question</th><th align="left" style="padding:8px">Your answer</th><th align="left" style="padding:8px">Correct</th><th align="left" style="padding:8px">Result</th></tr></thead><tbody>' + rows + '</tbody></table>' +
'<p style="color:#888;font-size:12px;margin-top:18px">Marking scheme: +1 correct · −0.25 wrong · 0 skipped. Keep practicing!</p></div></div></div>';
}
var MockApi = {
registerUser: function (data) {
var db = MockDB.load();
var name = String(data.name || '').trim();
var email = String(data.email || '').trim().toLowerCase();
var username = String(data.username || '').trim() || email.split('@')[0];
var password = String(data.password || '');
var role = data.role === 'teacher' ? 'teacher' : 'student';
if (name.length < 2) throw new Error('Please enter your full name.');
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Please enter a valid email address.');
if (password.length < 6) throw new Error('Password must be at least 6 characters.');
var dup = db.users.some(function (u) { return u.email === email; }) ||
db.users.some(function (u) { return norm(u.username) === norm(username); });
if (dup) throw new Error('An account with this email or username already exists.');
var isFirst = db.users.length === 0;
var status = isFirst ? 'approved' : 'pending';
var finalRole = isFirst ? 'teacher' : role;
var id = 'U' + (1000 + db.nextId++);
db.users.push({
id: id, name: name, email: email, username: username, password: mockSha256(password),
role: finalRole, status: status, deviceId: '', sessionToken: '', sessionExpiry: 0,
createdAt: new Date().toISOString()
});
if (isFirst) {
mockSendMail(db, email, 'CEE Mock Portal — You are the Administrator',
'<div style="font-family:Arial,sans-serif;padding:20px"><h3>Welcome, ' + esc(name) + '!</h3><p>You are the first user, so your account was auto-approved as the administrator (Teacher). Log in and approve future registrations from the dashboard.</p></div>');
} else {
db.users.forEach(function (u) {
if (u.role === 'teacher' && u.status === 'approved' && u.email !== email) {
mockSendMail(db, u.email, 'CEE Mock Portal — New registration pending approval',
'<div style="font-family:Arial,sans-serif;padding:20px"><h3>New registration</h3><p><b>' + esc(name) + '</b> (' + esc(email) + ') registered as a <b>' + role + '</b> and is awaiting approval.</p></div>');
}
});
}
MockDB.save(db);
return {
success: true, isFirst: isFirst,
message: isFirst ? 'Welcome! You are the first user — auto-approved as administrator (Teacher). You can now log in.'
: 'Registration successful! Your account is pending approval. A teacher will review it and email you.'
};
},
loginUser: function (email, password, device) {
var db = MockDB.load();
var em = String(email || '').trim().toLowerCase();
if (!db.loginFails) db.loginFails = {};
var lf = db.loginFails[em];
if (lf && lf.until > Date.now()) {
throw new Error('TOO_MANY_ATTEMPTS:Too many failed login attempts. Please wait a couple of minutes and try again.');
}
var u = null;
db.users.forEach(function (x) { if (x.email === em) u = x; });
if (!u) throw new Error('No account found for this email. Please register first.');
if (u.status === 'pending') throw new Error('ACCOUNT_PENDING:Your account is awaiting approval by a teacher/admin. You will be emailed once reviewed.');
if (u.status === 'rejected') throw new Error('ACCOUNT_REJECTED:Your registration was rejected. Please contact a teacher/admin.');
if (u.password !== mockSha256(password)) {
var n = (lf ? lf.n : 0) + 1;
db.loginFails[em] = { n: n, until: n >= 5 ? Date.now() + 120000 : 0 };
MockDB.save(db);
throw new Error('Incorrect password. Please try again.');
}
if (lf) delete db.loginFails[em];
if (u.deviceId && u.deviceId !== device) throw new Error('DEVICE_LOCKED:This account is already signed in on another device. Ask a teacher/admin to reset your device binding.');
var token = 'tok-' + Date.now() + '-' + Math.random().toString(36).slice(2, 12);
var expiry = Date.now() + SESSION_HOURS * 3600000;
if (!u.deviceId) u.deviceId = device;
u.sessionToken = token; u.sessionExpiry = expiry;
MockDB.save(db);
return { id: u.id, name: u.name, email: u.email, username: u.username, role: u.role, token: token, expiresAt: expiry };
},
logoutUser: function (userId, token) {
var db = MockDB.load();
var u = null;
db.users.forEach(function (x) { if (String(x.id) === String(userId)) u = x; });
if (u && u.sessionToken === String(token)) { u.sessionToken = ''; u.sessionExpiry = 0; MockDB.save(db); }
return { success: true };
},
startMockExam: function (userId, token, options) {
var db = MockDB.load();
mockRequireSession(db, userId, token);
var opts = normalizeExamOptionsClient(options);
var bank = db.questions.length ? db.questions : FALLBACK_CLIENT;
if (opts.mode === 'practice') {
bank = filterBankForPracticeClient(bank, opts);
if (!bank.length) throw new Error('No questions match your practice filters. Try different subjects, or ask a teacher to add questions to the bank.');
}
var attemptIndex = db.attempts.filter(function (a) { return String(a.userId) === String(userId); }).length;
var set = buildExamSetClient(bank, userId, attemptIndex, opts);
var dur = opts.mode === 'practice'
? (opts.timed ? opts.minutes * 60000 : 0)
: Math.max(MIN_EXAM_MINUTES, Math.round(set.length * SECONDS_PER_QUESTION / 60)) * 60000;
if (!db.examMeta) db.examMeta = {};
db.examMeta[String(userId)] = { start: Date.now(), dur: dur, opts: opts, attemptIndex: attemptIndex };
MockDB.save(db);
var reveal = opts.mode === 'practice' && opts.instantFeedback;
return {
questions: set.map(function (q) {
var it = { section: q.section, topic: q.topic, question: q.question, A: q.A, B: q.B, C: q.C, D: q.D, image: q.image || '', difficulty: normalizeDifficultyClient(q.difficulty) };
if (reveal) { it.answer = String(q.answer || '').toUpperCase(); it.explanation = q.explanation || ''; }
return it;
}),
questionCount: set.length, durationMinutes: Math.round(dur / 60000),
attemptIndex: attemptIndex, startedAt: new Date().toISOString(), mode: opts.mode, opts: opts
};
},
submitExam: function (userId, token, examData) {
var db = MockDB.load();
var user = mockRequireSession(db, userId, token);
var data = examData || {};
var answers = Array.isArray(data.answers) ? data.answers : [];
var mine = db.attempts.filter(function (a) { return String(a.userId) === String(user.id); });
mine.sort(function (x, y) { return x.timestamp < y.timestamp ? -1 : 1; });
var idx = num(data.attemptIndex);
if (mine.length > idx) {
var att = mine[idx];
var wasModel = String(att.section || '').indexOf('MODEL|') === 0;
var dailyDup = null;
if (wasModel) {
var dupDate = String(att.section || '').split('|')[1] || '';
var dRows = mockDailyLeaderboard(db, dupDate, user.id);
var meRow = null;
dRows.forEach(function (r) { if (r.isMe) meRow = r; });
dailyDup = meRow ? { date: dupDate, rank: meRow.rank, participants: dRows.length } : { date: dupDate, rank: 0, participants: dRows.length };
}
var bank2 = {};
(db.questions.length ? db.questions : FALLBACK_CLIENT).forEach(function (q) { bank2[norm(q.question)] = q; });
var items2 = db.responses.filter(function (r) { return String(r.userId) === String(user.id) && String(r.timestamp) === String(att.timestamp); })
.map(function (r) {
var q = bank2[norm(r.question)] || {};
return {
itemIndex: num(r.itemIndex), section: q.section || '', topic: r.topic || '',
question: r.question, options: [q.A || '', q.B || '', q.C || '', q.D || ''],
chosenLetter: String(r.chosenLetter || ''), correctLetter: String(r.correctLetter || ''),
wasCorrect: num(r.wasCorrect), explanation: r.explanation || '', image: r.image || q.image || '',
difficulty: normalizeDifficultyClient(q.difficulty)
};
})
.sort(function (a, b) { return a.itemIndex - b.itemIndex; });
return {
success: true, duplicate: true, timestamp: String(att.timestamp), score: num(att.score),
totalQuestions: num(att.totalQuestions), correct: num(att.correct), wrong: num(att.wrong),
skipped: num(att.skipped), accuracy: num(att.accuracy), items: items2, emailed: false,
autoSubmitted: false,
mode: wasModel ? 'model' : (String(att.section || '').indexOf('PRACTICE') === 0 ? 'practice' : 'mock'),
modelDate: wasModel ? (String(att.section || '').split('|')[1] || '') : '',
daily: dailyDup,
negMarking: true
};
}
var meta = db.examMeta ? db.examMeta[String(user.id)] : null;
if (!meta || num(meta.attemptIndex) !== num(data.attemptIndex)) {
meta = null;
} else if (db.examMeta) {
delete db.examMeta[String(user.id)];
}
if (data.options && data.options.mode === 'model' && (!meta || !meta.opts || meta.opts.mode !== 'model')) {
throw new Error('MODEL_NO_META:This model exam is no longer active. Open the "Model exam of the day" card on your dashboard and start it again.');
}
var opts = null;
var isModel = false;
var modelDateStr = '';
if (meta && meta.opts) {
if (meta.opts.mode === 'practice') opts = normalizeExamOptionsClient(meta.opts);
else if (meta.opts.mode === 'model') {
isModel = true;
modelDateStr = String(meta.opts.date || '');
opts = { mode: 'model', date: modelDateStr };
}
}
if (isModel) {
var todayRow = mockFindDailyRow(db, modelDateStr);
if (!todayRow || todayRow.status !== 'ready') {
throw new Error('MODEL_NO_META:The model exam is no longer available. Please refresh your dashboard.');
}
if (mockModelAttemptsFor(db, modelDateStr, user.id).length) {
var mine2 = db.attempts.filter(function (a) { return String(a.userId) === String(user.id); });
mine2.sort(function (x, y) { return x.timestamp < y.timestamp ? -1 : 1; });
var att3 = mine2[num(data.attemptIndex)];
if (att3) {
return MockApi.submitExam(userId, token, { attemptIndex: num(data.attemptIndex), answers: [] });
}
}
}
var isPractice = !!(opts && opts.mode === 'practice');
var penalty = (isPractice && opts.negMarking === false) ? 0 : 0.25;
var startedAt = meta ? num(meta.start) : (db.examStarts ? num(db.examStarts[String(user.id)]) : 0);
if (db.examStarts) delete db.examStarts[String(user.id)];
var allowedMs = meta ? num(meta.dur) : EXAM_DURATION_MINUTES * 60000;
var autoSubmitted = !!data.autoSubmitted;
if (allowedMs > 0 && startedAt && Date.now() - startedAt > allowedMs + 120000) autoSubmitted = true;
var answerMap = {};
answers.forEach(function (a) {
if (a && a.question) answerMap[norm(a.question)] = String(a.chosen || '').toUpperCase().slice(0, 1);
});
var bank = db.questions.length ? db.questions : FALLBACK_CLIENT;
if (opts && opts.mode === 'practice') bank = filterBankForPracticeClient(bank, opts);
var set = isModel ? mockResolveModelSet(db, mockFindDailyRow(db, modelDateStr)).set : buildExamSetClient(bank, userId, data.attemptIndex, opts);
var used = {}, items = [];
set.forEach(function (q, i) { used[norm(q.question)] = true; items.push(mockScoreItem(q, i, answerMap[norm(q.question)])); });
var extra = items.length;
answers.forEach(function (a) {
var key = norm(a && a.question || '');
if (!key || used[key]) return;
var q = null;
bank.forEach(function (x) { if (norm(x.question) === key) q = x; });
if (!q) return;
used[key] = true;
items.push(mockScoreItem(q, extra++, answerMap[key]));
});
var correct = 0, wrong = 0, skipped = 0, score = 0;
items.forEach(function (it) {
if (it.wasCorrect === 1) { correct++; score += 1; }
else if (it.wasCorrect === -1) { wrong++; score -= penalty; }
else skipped++;
});
score = Math.round(score * 100) / 100;
var total = items.length;
var accuracy = total ? Math.round((correct / total) * 1000) / 10 : 0;
var dist = {};
items.forEach(function (it) { var s = it.section || 'General'; dist[s] = (dist[s] || 0) + 1; });
var sectionStr = Object.keys(dist).map(function (k) { return k + ':' + dist[k]; }).join(' | ');
if (isPractice) sectionStr = 'PRACTICE|' + sectionStr;
if (isModel) sectionStr = 'MODEL|' + modelDateStr + '|' + sectionStr;
var ts = new Date().toISOString();
db.attempts.push({
timestamp: ts, userId: user.id, userName: user.name, email: user.email,
score: score, totalQuestions: total, correct: correct, wrong: wrong, skipped: skipped,
accuracy: accuracy, section: sectionStr, detailCount: total
});
items.forEach(function (it) {
db.responses.push({
timestamp: ts, userId: user.id, itemIndex: it.itemIndex, question: it.question,
topic: it.topic, chosenLetter: it.chosenLetter, correctLetter: it.correctLetter,
wasCorrect: it.wasCorrect, explanation: it.explanation, image: it.image
});
});
mockSendMail(db, user.email, 'CEE Mock Portal — ' + (isModel ? 'Model exam of the day — your result: ' : isPractice ? 'Your practice result: ' : 'Your result: ') + fmtScore(score) + '/' + total + ' (' + accuracy + '%)',
clientEmailHtml(user.name, { score: score, total: total, correct: correct, wrong: wrong, skipped: skipped, accuracy: accuracy, items: items, practice: isPractice }));
MockDB.save(db);
var dailyInfo = null;
if (isModel) {
try {
var lbRows2 = mockDailyLeaderboard(db, modelDateStr, user.id);
var meLb2 = null;
lbRows2.forEach(function (r) { if (r.isMe) meLb2 = r; });
dailyInfo = meLb2 ? { date: modelDateStr, rank: meLb2.rank, participants: lbRows2.length } : null;
} catch (e) { dailyInfo = null; }
}
return {
success: true, timestamp: ts, score: score, totalQuestions: total, correct: correct,
wrong: wrong, skipped: skipped, accuracy: accuracy, items: items, emailed: true, autoSubmitted: autoSubmitted,
mode: isModel ? 'model' : (isPractice ? 'practice' : 'mock'),
modelDate: isModel ? modelDateStr : '',
daily: dailyInfo,
negMarking: !isPractice || opts.negMarking !== false
};
},
getStudentStats: function (userId, token) {
var db = MockDB.load();
var user = mockRequireSession(db, userId, token);
var attempts = db.attempts.filter(function (a) { return String(a.userId) === String(user.id); })
.map(function (a) {
return { timestamp: String(a.timestamp), score: num(a.score), totalQuestions: num(a.totalQuestions), correct: num(a.correct), wrong: num(a.wrong), skipped: num(a.skipped), accuracy: num(a.accuracy), section: a.section || '' };
});
attempts.sort(function (x, y) { return y.timestamp < x.timestamp ? -1 : 1; });
var n = attempts.length;
var stats = {
totalAttempts: n,
avgScore: n ? Math.round(attempts.reduce(function (s, a) { return s + a.score; }, 0) / n * 100) / 100 : 0,
avgAccuracy: n ? Math.round(attempts.reduce(function (s, a) { return s + a.accuracy; }, 0) / n * 10) / 10 : 0,
bestScore: n ? Math.max.apply(null, attempts.map(function (a) { return a.score; })) : 0,
questionsSeen: attempts.reduce(function (s, a) { return s + a.totalQuestions; }, 0)
};
return { name: user.name, stats: stats, attempts: attempts.slice(0, 50) };
},
getAttemptReview: function (userId, token, ts) {
var db = MockDB.load();
var user = mockRequireSession(db, userId, token);
var key = String(ts);
var att = null;
db.attempts.forEach(function (a) {
if (String(a.userId) === String(user.id) && String(a.timestamp) === key) att = a;
});
if (!att) throw new Error('Attempt not found.');
var bank = {};
(db.questions.length ? db.questions : FALLBACK_CLIENT).forEach(function (q) { bank[norm(q.question)] = q; });
var items = db.responses.filter(function (r) { return String(r.userId) === String(user.id) && String(r.timestamp) === key; })
.map(function (r) {
var q = bank[norm(r.question)] || {};
return {
itemIndex: num(r.itemIndex), section: q.section || '', topic: r.topic || '',
question: r.question, options: [q.A || '', q.B || '', q.C || '', q.D || ''],
chosenLetter: String(r.chosenLetter || ''), correctLetter: String(r.correctLetter || ''),
wasCorrect: num(r.wasCorrect), explanation: r.explanation || '', image: r.image || q.image || '',
difficulty: normalizeDifficultyClient(q.difficulty)
};
})
.sort(function (a, b) { return a.itemIndex - b.itemIndex; });
return {
attempt: {
timestamp: key, score: num(att.score), totalQuestions: num(att.totalQuestions),
correct: num(att.correct), wrong: num(att.wrong), skipped: num(att.skipped),
accuracy: num(att.accuracy), section: att.section || ''
}, items: items
};
},
getTeacherStats: function (userId, token) {
var db = MockDB.load();
mockRequireSession(db, userId, token, 'teacher');
function pub(u) {
return { id: u.id, name: u.name, email: u.email, username: u.username, role: u.role, status: u.status, createdAt: u.createdAt, deviceLocked: !!u.deviceId };
}
var pending = db.users.filter(function (u) { return u.status === 'pending'; }).map(pub);
var students = db.users.filter(function (u) { return u.status === 'approved'; }).map(pub);
var recent = db.attempts.slice().sort(function (a, b) { return a.timestamp < b.timestamp ? 1 : -1; }).slice(0, 20).map(function (a) {
return { timestamp: String(a.timestamp), userName: a.userName, score: num(a.score), totalQuestions: num(a.totalQuestions), accuracy: num(a.accuracy) };
});
var unreadMessages = (db.messages || []).filter(function (m) {
return String(m.toRole) === 'teacher' && !String(m.readAt || '').trim();
}).length;
return {
stats: { pending: pending.length, students: students.length, questions: db.questions.length, attempts: db.attempts.length, unreadMessages: unreadMessages },
pending: pending, students: students, recentAttempts: recent
};
},
getTeacherAnalytics: function (userId, token) {
var db = MockDB.load();
mockRequireSession(db, userId, token, 'teacher');
var students = db.users.filter(function (u) { return u.status === 'approved' && u.role === 'student'; });
var bank = {};
(db.questions.length ? db.questions : FALLBACK_CLIENT).forEach(function (q) { bank[norm(q.question)] = q; });
var attempts = db.attempts, responses = db.responses;
var byUser = {};
students.forEach(function (u) {
byUser[String(u.id)] = { id: u.id, name: u.name, email: u.email, attempts: 0, sumAcc: 0, best: 0, lastTs: '', correct: 0, wrong: 0, skipped: 0, secStats: {} };
});
attempts.forEach(function (a) {
var g = byUser[String(a.userId)];
if (!g) return;
g.attempts++; g.sumAcc += num(a.accuracy);
if (num(a.score) > g.best) g.best = num(a.score);
var ts = String(a.timestamp || '');
if (ts > g.lastTs) g.lastTs = ts;
});
responses.forEach(function (r) {
var g = byUser[String(r.userId)];
if (!g) return;
var q = bank[norm(r.question)] || {};
var sec = String(q.section || '').trim() || 'General';
var was = num(r.wasCorrect);
if (!g.secStats[sec]) g.secStats[sec] = { correct: 0, wrong: 0, skipped: 0 };
if (was === 1) { g.correct++; g.secStats[sec].correct++; }
else if (was === -1) { g.wrong++; g.secStats[sec].wrong++; }
else { g.skipped++; g.secStats[sec].skipped++; }
});
var rows = Object.keys(byUser).map(function (k) {
var g = byUser[k];
var totalQ = g.correct + g.wrong + g.skipped;
var weak = null, worst = 101;
Object.keys(g.secStats).forEach(function (s) {
var st = g.secStats[s];
var t = st.correct + st.wrong + st.skipped;
if (t < 3) return;
var acc = Math.round(st.correct / t * 1000) / 10;
if (acc < worst) { worst = acc; weak = { section: s, accuracy: acc }; }
});
return {
id: g.id, name: g.name, email: g.email,
attempts: g.attempts,
avgAccuracy: g.attempts ? Math.round(g.sumAcc / g.attempts * 10) / 10 : 0,
bestScore: g.best,
answered: totalQ,
accuracy: totalQ ? Math.round(g.correct / totalQ * 1000) / 10 : 0,
lastActive: g.lastTs,
weakSubject: weak
};
});
rows.sort(function (a, b) { return b.avgAccuracy - a.avgAccuracy || b.attempts - a.attempts; });
var secTotals = {}, topicTotals = {};
responses.forEach(function (r) {
var q = bank[norm(r.question)] || {};
var sec = String(q.section || '').trim() || 'General';
var was = num(r.wasCorrect);
if (!secTotals[sec]) secTotals[sec] = { section: sec, correct: 0, wrong: 0, skipped: 0 };
if (was === 1) secTotals[sec].correct++;
else if (was === -1) secTotals[sec].wrong++;
else secTotals[sec].skipped++;
var top = String(r.topic || '').trim() || String(q.topic || '').trim();
if (top) {
var kk = sec + '#' + top;
if (!topicTotals[kk]) topicTotals[kk] = { section: sec, topic: top, correct: 0, wrong: 0, skipped: 0 };
if (was === 1) topicTotals[kk].correct++;
else if (was === -1) topicTotals[kk].wrong++;
else topicTotals[kk].skipped++;
}
});
function finish(o) {
var total = o.correct + o.wrong + o.skipped;
o.total = total;
o.accuracy = total ? Math.round(o.correct / total * 1000) / 10 : 0;
return o;
}
var sections = Object.keys(secTotals).map(function (k) { return finish(secTotals[k]); });
sections.sort(function (a, b) { return b.total - a.total; });
var topics = Object.keys(topicTotals).map(function (k) { return finish(topicTotals[k]); });
topics.sort(function (a, b) { return a.accuracy - b.accuracy || b.total - a.total; });
var totCor = 0, totAll = 0;
Object.keys(secTotals).forEach(function (k) {
totCor += secTotals[k].correct;
totAll += secTotals[k].correct + secTotals[k].wrong + secTotals[k].skipped;
});
var active = rows.filter(function (s) { return s.attempts > 0; }).length;
return {
overview: {
students: students.length,
activeStudents: active,
participation: students.length ? Math.round(active / students.length * 100) : 0,
attempts: attempts.length,
avgAccuracy: totAll ? Math.round(totCor / totAll * 1000) / 10 : 0,
questionsAnswered: totAll
},
sections: sections,
weakTopics: topics.filter(function (t) { return t.total >= 3 && t.accuracy < 70; }).slice(0, 8),
students: rows
};
},
approveUser: function (targetUserId, adminId, adminToken) {
var db = MockDB.load();
mockRequireSession(db, adminId, adminToken, 'teacher');
var t = null;
db.users.forEach(function (u) { if (String(u.id) === String(targetUserId)) t = u; });
if (!t) throw new Error('User not found.');
if (t.status !== 'pending') throw new Error('This user is not pending (status: ' + t.status + ').');
t.status = 'approved';
mockSendMail(db, t.email, 'CEE Mock Portal — Your account is approved',
'<div style="font-family:Arial,sans-serif;padding:20px"><h3>Approved!</h3><p>Hi ' + esc(t.name) + ', your account has been approved. You can now log in to CEE Mock Portal and take mock tests.</p></div>');
MockDB.save(db);
return { success: true, message: t.name + ' approved and notified by email.' };
},
rejectUser: function (targetUserId, adminId, adminToken) {
var db = MockDB.load();
mockRequireSession(db, adminId, adminToken, 'teacher');
var t = null;
db.users.forEach(function (u) { if (String(u.id) === String(targetUserId)) t = u; });
if (!t) throw new Error('User not found.');
if (t.status !== 'pending') throw new Error('This user is not pending (status: ' + t.status + ').');
t.status = 'rejected';
mockSendMail(db, t.email, 'CEE Mock Portal — Registration update',
'<div style="font-family:Arial,sans-serif;padding:20px"><h3>Registration update</h3><p>Hi ' + esc(t.name) + ', unfortunately your registration was not approved at this time. Please contact your teacher/admin if you believe this is a mistake.</p></div>');
MockDB.save(db);
return { success: true, message: t.name + ' rejected and notified by email.' };
},
resetDevice: function (targetUserId, adminId, adminToken) {
var db = MockDB.load();
mockRequireSession(db, adminId, adminToken, 'teacher');
var t = null;
db.users.forEach(function (u) { if (String(u.id) === String(targetUserId)) t = u; });
if (!t) throw new Error('User not found.');
t.deviceId = ''; t.sessionToken = ''; t.sessionExpiry = 0;
MockDB.save(db);
return { success: true, message: 'Device binding reset for ' + t.name + '. They can log in from a new device now.' };
},
getAllQuestions: function (userId, token) {
var db = MockDB.load();
mockRequireSession(db, userId, token, 'teacher');
return db.questions.slice(-1000).map(function (q) {
return { section: q.section, topic: q.topic, question: q.question, A: q.A, B: q.B, C: q.C, D: q.D, answer: q.answer, explanation: q.explanation, image: q.image, difficulty: normalizeDifficultyClient(q.difficulty) };
});
},
addQuestion: function (userId, token, q) {
var db = MockDB.load();
mockRequireSession(db, userId, token, 'teacher');
var v = validateQuestionObj(q);
if (!v.ok) throw new Error(v.error);
var key = norm(q.question);
var dupe = db.questions.some(function (x) { return norm(x.question) === key; });
if (dupe) throw new Error('DUPLICATE_QUESTION:This question text already exists in the bank. Edit it instead of adding a duplicate.');
db.questions.push(normalizeQuestionObj(q));
MockDB.save(db);
return { success: true, message: 'Question added to the bank.' };
},
deleteQuestion: function (userId, token, questionText) {
var db = MockDB.load();
mockRequireSession(db, userId, token, 'teacher');
var key = norm(questionText);
var idx = -1;
db.questions.forEach(function (q, i) { if (idx < 0 && norm(q.question) === key) idx = i; });
if (idx < 0) throw new Error('Question not found in the bank.');
var locked = mockModelLockedTexts(db);
if (locked[key]) {
throw new Error('MODEL_QUESTION_LOCKED:This question is part of today’s (or an upcoming) model exam — the fixed paper must stay intact while it is live. Delete it after the exam day, or regenerate that model exam first.');
}
db.questions.splice(idx, 1);
MockDB.save(db);
return { success: true, message: 'Question deleted.' };
},
bulkUploadQuestions: function (userId, token, rows, fileName, dryRun) {
var db = MockDB.load();
mockRequireSession(db, userId, token, 'teacher');
var list = Array.isArray(rows) ? rows : [];
var valid = [], errors = [];
var existing = {};
db.questions.forEach(function (x) { existing[norm(x.question)] = true; });
list.forEach(function (r, i) {
var v = validateQuestionObj(r);
if (!v.ok) { errors.push('Row ' + (i + 1) + ': ' + v.error); return; }
var key = norm(r.question);
if (existing[key]) { errors.push('Row ' + (i + 1) + ': duplicate question (already in the bank)'); return; }
existing[key] = true;
valid.push(normalizeQuestionObj(r));
});
if (valid.length && !dryRun) db.questions.push.apply(db.questions, valid);
MockDB.save(db);
return { success: true, dryRun: !!dryRun, inserted: dryRun ? 0 : valid.length, wouldInsert: valid.length, skipped: errors.length, errors: errors.slice(0, 10), fileName: fileName || '' };
},
getStudentAnalytics: function (userId, token) {
var db = MockDB.load();
var user = mockRequireSession(db, userId, token);
var bank = {};
(db.questions.length ? db.questions : FALLBACK_CLIENT).forEach(function (q) { bank[norm(q.question)] = q; });
var secStats = {}, topicStats = {};
db.responses.forEach(function (r) {
if (String(r.userId) !== String(user.id)) return;
var q = bank[norm(r.question)] || {};
var sec = String(q.section || '').trim() || 'General';
var top = String(r.topic || '').trim() || String(q.topic || '').trim();
var was = num(r.wasCorrect);
if (!secStats[sec]) secStats[sec] = { section: sec, correct: 0, wrong: 0, skipped: 0 };
if (was === 1) secStats[sec].correct++;
else if (was === -1) secStats[sec].wrong++;
else secStats[sec].skipped++;
if (top) {
var k = sec + '#' + top;
if (!topicStats[k]) topicStats[k] = { section: sec, topic: top, correct: 0, wrong: 0, skipped: 0 };
if (was === 1) topicStats[k].correct++;
else if (was === -1) topicStats[k].wrong++;
else topicStats[k].skipped++;
}
});
function finish(o) {
var total = o.correct + o.wrong + o.skipped;
o.total = total;
o.accuracy = total ? Math.round(o.correct / total * 1000) / 10 : 0;
return o;
}
var sections = Object.keys(secStats).map(function (k) { return finish(secStats[k]); });
sections.sort(function (a, b) { return b.total - a.total; });
var topics = Object.keys(topicStats).map(function (k) { return finish(topicStats[k]); });
topics.sort(function (a, b) { return a.accuracy - b.accuracy || b.wrong - a.wrong; });
return {
sections: sections,
weakTopics: topics.filter(function (t) { return t.total >= 3 && t.accuracy < 70; }).slice(0, 5)
};
},
getLeaderboard: function (userId, token) {
var db = MockDB.load();
var user = mockRequireSession(db, userId, token);
var users = {};
db.users.forEach(function (u) { if (u.status === 'approved') users[String(u.id)] = u; });
var agg = {};
db.attempts.forEach(function (a) {
var id = String(a.userId);
var u = users[id];
if (!u || u.role !== 'student') return;
if (!agg[id]) agg[id] = { id: id, name: u.name, attempts: 0, sumAcc: 0, best: 0 };
agg[id].attempts++;
agg[id].sumAcc += num(a.accuracy);
if (num(a.score) > agg[id].best) agg[id].best = num(a.score);
});
var rows = Object.keys(agg).map(function (k) {
var g = agg[k];
g.avgAccuracy = Math.round(g.sumAcc / g.attempts * 10) / 10;
return g;
});
rows.sort(function (a, b) { return b.avgAccuracy - a.avgAccuracy || b.attempts - a.attempts; });
var top = rows.slice(0, 10).map(function (r, i) {
return { rank: i + 1, id: r.id, name: r.name, attempts: r.attempts, avgAccuracy: r.avgAccuracy, bestScore: r.best, isMe: String(r.id) === String(user.id) };
});
var myRank = 0;
for (var i = 0; i < rows.length; i++) if (String(rows[i].id) === String(user.id)) { myRank = i + 1; break; }
return { leaders: top, myRank: myRank, totalStudents: rows.length };
},
changePassword: function (userId, token, currentPw, newPw) {
var db = MockDB.load();
var user = mockRequireSession(db, userId, token);
if (user.password !== mockSha256(currentPw)) throw new Error('Your current password is incorrect.');
if (String(newPw || '').length < 6) throw new Error('The new password must be at least 6 characters.');
if (newPw === currentPw) throw new Error('The new password must be different from the current one.');
user.password = mockSha256(newPw);
mockSendMail(db, user.email, 'CEE Mock Portal — Your password was changed',
'<div style="font-family:Arial,sans-serif;padding:20px"><h3>Password changed</h3><p>Hi ' + esc(user.name) + ', your account password was just changed. If this was not you, contact your teacher/admin immediately.</p></div>');
MockDB.save(db);
return { success: true, message: 'Password updated. Use it on your next login.' };
},
updateQuestion: function (userId, token, originalQuestionText, q) {
var db = MockDB.load();
mockRequireSession(db, userId, token, 'teacher');
var v = validateQuestionObj(q);
if (!v.ok) throw new Error(v.error);
var key = norm(originalQuestionText);
var idx = -1;
db.questions.forEach(function (x, i) { if (idx < 0 && norm(x.question) === key) idx = i; });
if (idx < 0) throw new Error('Question not found in the bank.');
var locked = mockModelLockedTexts(db);
if (locked[key] || locked[norm(q.question)]) {
throw new Error('MODEL_QUESTION_LOCKED:This question is part of today’s (or an upcoming) model exam — the fixed paper must stay intact while it is live. Edit it after the exam day, or regenerate that model exam first.');
}
var newKey = norm(q.question);
var collision = db.questions.some(function (x, i) { return i !== idx && norm(x.question) === newKey; });
if (collision) throw new Error('DUPLICATE_QUESTION:Another question with this exact text already exists in the bank.');
db.questions[idx] = normalizeQuestionObj(q);
MockDB.save(db);
return { success: true, message: 'Question updated.' };
},
getStudentDetail: function (userId, token, targetUserId) {
var db = MockDB.load();
mockRequireSession(db, userId, token, 'teacher');
var target = null;
db.users.forEach(function (u) { if (String(u.id) === String(targetUserId) && u.role === 'student') target = u; });
if (!target) throw new Error('Student not found.');
var bank = {};
(db.questions.length ? db.questions : FALLBACK_CLIENT).forEach(function (q) { bank[norm(q.question)] = q; });
var responses = db.responses.filter(function (r) { return String(r.userId) === String(target.id); });
var attempts = db.attempts.filter(function (a) { return String(a.userId) === String(target.id); }).map(function (a) {
return { timestamp: String(a.timestamp), score: num(a.score), totalQuestions: num(a.totalQuestions), correct: num(a.correct), wrong: num(a.wrong), skipped: num(a.skipped), accuracy: num(a.accuracy), section: String(a.section || '') };
}).sort(function (x, y) { return y.timestamp < x.timestamp ? -1 : y.timestamp > x.timestamp ? 1 : 0; });
var secStats = {}, topicStats = {};
responses.forEach(function (r) {
var q = bank[norm(r.question)] || {};
var sec = String(q.section || '').trim() || 'General';
var top = String(r.topic || '').trim() || String(q.topic || '').trim();
var was = num(r.wasCorrect);
if (!secStats[sec]) secStats[sec] = { section: sec, correct: 0, wrong: 0, skipped: 0 };
if (was === 1) secStats[sec].correct++;
else if (was === -1) secStats[sec].wrong++;
else secStats[sec].skipped++;
if (top) {
var k = sec + '#' + top;
if (!topicStats[k]) topicStats[k] = { section: sec, topic: top, correct: 0, wrong: 0, skipped: 0 };
if (was === 1) topicStats[k].correct++;
else if (was === -1) topicStats[k].wrong++;
else topicStats[k].skipped++;
}
});
function finish(o) {
var total = o.correct + o.wrong + o.skipped;
o.total = total;
o.accuracy = total ? Math.round(o.correct / total * 1000) / 10 : 0;
return o;
}
var sections = Object.keys(secStats).map(function (k) { return finish(secStats[k]); });
sections.sort(function (a, b) { return b.total - a.total; });
var topics = Object.keys(topicStats).map(function (k) { return finish(topicStats[k]); });
topics.sort(function (a, b) { return a.accuracy - b.accuracy || b.total - a.total; });
var n = attempts.length;
var sumAcc = attempts.reduce(function (s, a) { return s + a.accuracy; }, 0);
return {
profile: { id: target.id, name: target.name, email: target.email, username: target.username || '', status: target.status, createdAt: target.createdAt || '' },
stats: {
attempts: n,
avgAccuracy: n ? Math.round(sumAcc / n * 10) / 10 : 0,
bestScore: n ? Math.max.apply(null, attempts.map(function (a) { return a.score; })) : 0,
answered: responses.length
},
sections: sections,
weakTopics: topics.filter(function (t) { return t.total >= 3 && t.accuracy < 70; }).slice(0, 5),
attempts: attempts.slice(0, 12)
};
},
sendStudentEmail: function (userId, token, targetUserId, message) {
var db = MockDB.load();
var sender = mockRequireSession(db, userId, token, 'teacher');
var target = null;
db.users.forEach(function (u) { if (String(u.id) === String(targetUserId) && u.role === 'student') target = u; });
if (!target) throw new Error('Student not found.');
if (target.status !== 'approved') throw new Error('This student is not approved yet.');
var msg = String(message || '').trim();
if (!msg) throw new Error('Write a message first.');
if (msg.length > 2000) throw new Error('Message too long (max 2000 characters).');
mockSendMail(db, target.email, 'CEE Mock Portal — Message from ' + sender.name,
'<div style="font-family:Arial,sans-serif;padding:20px"><h3>A message from your teacher</h3>' +
'<p>Hi ' + esc(target.name) + ',</p>' +
'<p style="white-space:pre-wrap">' + esc(msg) + '</p>' +
'<p style="color:#888;font-size:12px">— ' + esc(sender.name) + '</p></div>');
if (!db.messages) db.messages = [];
db.messages.unshift({
timestamp: new Date().toISOString(), fromId: sender.id, fromName: sender.name,
fromEmail: sender.email, fromRole: 'teacher', toId: target.id, toRole: 'student',
subject: 'Message from your teacher', body: msg, readAt: ''
});
MockDB.save(db);
return { success: true, emailed: true, message: 'Message sent to ' + target.name + ' (' + target.email + ').' };
},
sendStudentMessage: function (userId, token, subject, message) {
var db = MockDB.load();
var user = mockRequireSession(db, userId, token);
var subj = String(subject || '').trim();
var msg = String(message || '').trim();
if (!subj) throw new Error('Add a short subject first.');
if (subj.length > 120) throw new Error('Subject too long (max 120 characters).');
if (!msg) throw new Error('Write a message first.');
if (msg.length > 2000) throw new Error('Message too long (max 2000 characters).');
var teachers = db.users.filter(function (u) { return u.role === 'teacher' && u.status === 'approved'; });
if (!teachers.length) throw new Error('No approved teacher account exists yet.');
if (!db.messages) db.messages = [];
db.messages.unshift({
timestamp: new Date().toISOString(), fromId: user.id, fromName: user.name,
fromEmail: user.email, fromRole: user.role, toId: '', toRole: 'teacher',
subject: subj, body: msg, readAt: ''
});
mockSendMail(db, teachers[0].email, 'CEE Mock Portal — Message from ' + user.name,
'<div style="font-family:Arial,sans-serif;padding:20px"><h3>Message from a student</h3>' +
'<p><b>' + esc(user.name) + '</b> (' + esc(user.email) + ') sent you a message:</p>' +
'<p style="font-size:15px;font-weight:600">' + esc(subj) + '</p>' +
'<p style="white-space:pre-wrap">' + esc(msg) + '</p>' +
'<p style="color:#888;font-size:12px">Open the teacher dashboard inbox to reply.</p></div>');
MockDB.save(db);
return { success: true, emailed: true, message: 'Message sent — your teacher will see it in their inbox and by email.' };
},
getInbox: function (userId, token) {
var db = MockDB.load();
var user = mockRequireSession(db, userId, token);
var isTeacher = user.role === 'teacher';
var rows = (db.messages || []).filter(function (m) {
if (isTeacher) return String(m.toRole) === 'teacher';
return String(m.toRole) === 'student' && String(m.toId) === String(user.id);
});
rows = rows.slice().sort(function (a, b) { return a.timestamp < b.timestamp ? 1 : -1; }).slice(0, 50)
.map(function (m) {
return {
timestamp: String(m.timestamp), fromId: String(m.fromId || ''), fromName: String(m.fromName || ''),
fromEmail: String(m.fromEmail || ''), fromRole: String(m.fromRole || ''),
subject: String(m.subject || ''), body: String(m.body || ''),
read: !!String(m.readAt || '').trim()
};
});
return {
role: isTeacher ? 'teacher' : 'student',
unread: rows.filter(function (m) { return !m.read; }).length,
messages: rows
};
},
markInboxRead: function (userId, token, keys) {
var db = MockDB.load();
var user = mockRequireSession(db, userId, token);
var isTeacher = user.role === 'teacher';
var want = Array.isArray(keys) ? keys.map(function (k) { return String(k); }) : null;
var marked = 0;
(db.messages || []).forEach(function (m) {
var mine = isTeacher ? String(m.toRole) === 'teacher'
: (String(m.toRole) === 'student' && String(m.toId) === String(user.id));
if (mine && !String(m.readAt || '').trim() && (!want || want.indexOf(String(m.timestamp)) >= 0)) {
m.readAt = new Date().toISOString();
marked++;
}
});
MockDB.save(db);
return { success: true, marked: marked };
},
generateDailyExam: function (userId, token, targetDate, questionCount, notifyStudents) {
var db = MockDB.load();
var user = mockRequireSession(db, userId, token, 'teacher');
var today = clientTodayStr();
var date = String(targetDate || '').trim() || clientDateAddDays(today, 1);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) {
throw new Error('Pick today or a future date — you cannot generate a model exam for a day that already passed.');
}
var count = Math.max(1, Math.min(100, num(questionCount) || MODEL_DEFAULT_COUNT_CLIENT));
if (!db.questions.length) throw new Error('The question bank is empty — add questions before generating a model exam.');
var prev = mockFindDailyRow(db, date);
if (prev) {
var participants = mockModelAttempts(db, date).length;
if (participants > 0) {
throw new Error('MODEL_EXAM_LOCKED:' + participants + ' student' + (participants > 1 ? 's have' : ' has') + ' already taken this exam — a live model exam cannot be replaced.');
}
}
var row = mockWriteDailyRow(db, date, user.name, count, false, prev);
var notified = 0;
if (notifyStudents) {
db.users.forEach(function (u) {
if (u.status === 'approved' && u.role === 'student') {
mockSendMail(db, u.email, 'CEE Mock Portal — Model exam scheduled for ' + date, modelReadyEmailHtml(u.name, date, row.questionCount));
notified++;
}
});
}
mockSendMail(db, user.email, 'CEE Mock Portal — Model exam for ' + date + ' is ready', modelReadyEmailHtml(user.name, date, row.questionCount));
MockDB.save(db);
return {
success: true, date: date, questionCount: row.questionCount, replaced: !!prev,
notified: notified, generatedAt: row.generatedAt,
preview: mockDailyPreviewItems(db, row)
};
},
getDailyExamStatus: function (userId, token) {
var db = MockDB.load();
var user = mockRequireSession(db, userId, token);
mockAutopilotTick(db);
var today = clientTodayStr();
var tomorrow = clientDateAddDays(today, 1);
function brief(dateStr) {
var r = mockFindDailyRow(db, dateStr);
if (!r || r.status !== 'ready') return { date: dateStr, ready: false };
var parts = mockModelAttempts(db, dateStr);
var avg = parts.length ? Math.round(parts.reduce(function (s, a) { return s + num(a.accuracy); }, 0) / parts.length * 10) / 10 : 0;
var top = 0;
parts.forEach(function (a) { if (num(a.score) > top) top = num(a.score); });
return {
date: dateStr, ready: true, questionCount: r.questionCount || r.texts.length,
generatedBy: r.generatedBy, generatedAt: r.generatedAt, auto: r.auto,
participants: parts.length, avgAccuracy: avg, topScore: top
};
}
var isTeacher = user.role === 'teacher';
var payload = {
today: brief(today),
tomorrow: brief(tomorrow),
autopilot: { enabled: !!(db.daily && db.daily.auto && db.daily.auto.enabled), hour: (db.daily && db.daily.auto && num(db.daily.auto.hour)) || 20 }
};
if (!isTeacher) {
var mine = mockModelAttemptsFor(db, today, user.id);
payload.myAttempt = mine.length ? {
score: num(mine[0].score), total: num(mine[0].totalQuestions),
correct: num(mine[0].correct), wrong: num(mine[0].wrong), skipped: num(mine[0].skipped),
accuracy: num(mine[0].accuracy), timestamp: String(mine[0].timestamp)
} : null;
}
var lbRows = mockDailyLeaderboard(db, today, user.id);
payload.leaderboard = {
date: today, participants: lbRows.length,
avg: lbRows.length ? Math.round(lbRows.reduce(function (s, r) { return s + r.accuracy; }, 0) / lbRows.length * 10) / 10 : 0,
leaders: lbRows.slice(0, 10),
myRank: (function () { var rk = 0; lbRows.forEach(function (r) { if (r.isMe) rk = r.rank; }); return rk; })()
};
if (isTeacher) {
var hist = [];
for (var i = 1; i <= MODEL_HISTORY_DAYS_CLIENT; i++) {
var b = brief(clientDateAddDays(today, -i));
if (b.ready) hist.push(b);
}
payload.history = hist;
var todayRow = mockFindDailyRow(db, today);
var tomorrowRow = mockFindDailyRow(db, tomorrow);
payload.todayPreview = todayRow && todayRow.status === 'ready' ? mockDailyPreviewItems(db, todayRow) : [];
payload.tomorrowPreview = tomorrowRow && tomorrowRow.status === 'ready' ? mockDailyPreviewItems(db, tomorrowRow) : [];
}
return payload;
},
startDailyExam: function (userId, token) {
var db = MockDB.load();
var user = mockRequireSession(db, userId, token);
if (user.role !== 'student') {
throw new Error('FORBIDDEN:Teachers cannot take the model exam — use "Preview questions" on the management card instead.');
}
var today = clientTodayStr();
var row = mockFindDailyRow(db, today);
if (!row || row.status !== 'ready') {
throw new Error('MODEL_NONE_TODAY:No model exam is scheduled for today. Check back tomorrow!');
}
if (mockModelAttemptsFor(db, today, user.id).length) {
throw new Error('MODEL_ALREADY_TAKEN:You already took today’s model exam — your result is on the "Model exam of the day" card.');
}
var resolved = mockResolveModelSet(db, row);
if (!resolved.set.length) {
throw new Error('MODEL_BROKEN:Today’s model exam questions were removed from the bank. Please ask your teacher to regenerate it.');
}
var attemptIndex = db.attempts.filter(function (a) { return String(a.userId) === String(user.id); }).length;
var dur = Math.max(MIN_EXAM_MINUTES, Math.round(resolved.set.length * SECONDS_PER_QUESTION / 60)) * 60000;
if (!db.examMeta) db.examMeta = {};
db.examMeta[String(user.id)] = { start: Date.now(), dur: dur, opts: { mode: 'model', date: today }, attemptIndex: attemptIndex };
MockDB.save(db);
return {
questions: resolved.set.map(function (q) {
return { section: q.section, topic: q.topic, question: q.question, A: q.A, B: q.B, C: q.C, D: q.D, image: q.image || '', difficulty: normalizeDifficultyClient(q.difficulty) };
}),
questionCount: resolved.set.length, durationMinutes: Math.round(dur / 60000),
attemptIndex: attemptIndex, startedAt: new Date().toISOString(), mode: 'model', date: today,
participants: mockModelAttempts(db, today).length
};
},
getDailyLeaderboard: function (userId, token, dateStr) {
var db = MockDB.load();
var user = mockRequireSession(db, userId, token);
var date = String(dateStr || '').trim() || clientTodayStr();
var row = mockFindDailyRow(db, date);
if (!row || row.status !== 'ready') throw new Error('No model exam found for ' + date + '.');
var lbRows = mockDailyLeaderboard(db, date, user.id);
return {
date: date, questionCount: row.questionCount || row.texts.length,
participants: lbRows.length,
avg: lbRows.length ? Math.round(lbRows.reduce(function (s, r) { return s + r.accuracy; }, 0) / lbRows.length * 10) / 10 : 0,
leaders: lbRows.slice(0, 10),
myRank: (function () { var rk = 0; lbRows.forEach(function (r) { if (r.isMe) rk = r.rank; }); return rk; })()
};
},
setDailyAutopilot: function (userId, token, enabled, hour) {
var db = MockDB.load();
var user = mockRequireSession(db, userId, token, 'teacher');
var on = !!enabled;
var h = num(hour) || 20;
h = Math.max(0, Math.min(23, Math.round(h)));
if (!db.daily) db.daily = { exams: [], auto: { enabled: false, hour: 20 } };
if (!db.daily.auto) db.daily.auto = { enabled: false, hour: 20 };
db.daily.auto = { enabled: on, hour: h };
if (on) mockAutopilotTick(db);
MockDB.save(db);
return { success: true, enabled: on, hour: h, by: user.name };
},
autoGenerateDailyExam: function () {
var db = MockDB.load();
var tomorrow = clientDateAddDays(clientTodayStr(), 1);
var prev = mockFindDailyRow(db, tomorrow);
if (prev && prev.status === 'ready') return { skipped: 'already-scheduled' };
if (prev && mockModelAttempts(db, tomorrow).length) return { skipped: 'locked' };
if (!db.questions.length) return { skipped: 'empty-bank' };
var row = mockWriteDailyRow(db, tomorrow, 'System (autopilot)', MODEL_DEFAULT_COUNT_CLIENT, true, prev);
MockDB.save(db);
return { generated: true, date: tomorrow, questionCount: row.questionCount };
}
};
function validateQuestionObj(q) {
if (!q) return { ok: false, error: 'Empty row.' };
if (!String(q.question || '').trim()) return { ok: false, error: 'Missing question text.' };
var letters = ['A', 'B', 'C', 'D'];
for (var i = 0; i < 4; i++) {
if (!String(q[letters[i]] || '').trim()) return { ok: false, error: 'Missing option ' + letters[i] + '.' };
}
var ans = String(q.answer || '').trim().toUpperCase();
if (['1', '2', '3', '4'].indexOf(ans) >= 0) ans = LETTERS[Number(ans) - 1];
if (LETTERS.indexOf(ans) < 0) return { ok: false, error: 'Answer must be A, B, C or D.' };
if (String(q.image || '').length > 48000) return { ok: false, error: 'Image too large (max ~45 KB) — compress it or use a URL.' };
return { ok: true };
}
function normalizeQuestionObj(q) {
var ans = String(q.answer || '').trim().toUpperCase();
if (['1', '2', '3', '4'].indexOf(ans) >= 0) ans = LETTERS[Number(ans) - 1];
return {
section: String(q.section || '').trim() || 'General',
topic: String(q.topic || '').trim(),
question: String(q.question || '').trim(),
A: String(q.A || '').trim(), B: String(q.B || '').trim(),
C: String(q.C || '').trim(), D: String(q.D || '').trim(),
answer: ans,
explanation: String(q.explanation || '').trim(),
image: String(q.image || '').trim(),
difficulty: normalizeDifficultyClient(q.difficulty)
};
}

/* ---------------- 4. server bridge ---------------- */
function callServer(fn) {
var args = Array.prototype.slice.call(arguments, 1);
if (APPSCRIPT_URL) {
return fetch(APPSCRIPT_URL, {
method: 'POST',
headers: { 'Content-Type': 'text/plain;charset=utf-8' },
body: JSON.stringify({ fn: fn, args: args })
})
.then(function(res) { return res.json(); })
.then(function(data) {
if (data.success === false) throw new Error(data.error || 'Server error');
return data.result;
});
} else {
return new Promise(function (resolve, reject) {
setTimeout(function () {
try {
if (!MockApi[fn]) { reject(new Error('Unknown server function: ' + fn)); return; }
resolve(MockApi[fn].apply(null, args));
} catch (e) { reject(e instanceof Error ? e : new Error(String(e))); }
}, 140 + Math.random() * 260);
});
}
}

/* ---------------- 5. app state & router ---------------- */
var S = { user: null, cur: 0 };
var Exam = { active: null, timerId: null };
var P = { bankCache: null, snippets: [], bulkRows: [], bulkFileName: '', editing: null, reviewFilter: 'all', attemptFilter: 'all', lastReviewMeta: null };
var SECTIONS_ALL = ['sec-auth', 'sec-student', 'sec-teacher', 'sec-exam', 'sec-result', 'sec-review', 'sec-pdf', 'sec-syllabus'];
function showSection(id) {
SECTIONS_ALL.forEach(function (s) { $(s).classList.add('hidden'); });
 $(id).classList.remove('hidden');
window.scrollTo({ top: 0, behavior: 'auto' });
}
function routePublic() { showSection('sec-auth'); updateChrome(); }
function dashboardSection() { return S.user && S.user.role === 'teacher' ? 'sec-teacher' : 'sec-student'; }
function routeDashboard() { showSection(dashboardSection()); updateChrome(); }
function updateChrome() {
var logged = !!S.user;
 $('userChip').classList.toggle('hidden', !logged);
 $('btnLogout').classList.toggle('hidden', !logged);
 $('btnSettings').classList.toggle('hidden', !logged);
if (logged) {
 $('userName').textContent = S.user.name;
 $('userAvatar').textContent = (S.user.name || '?').trim().charAt(0).toUpperCase();
var roleEl = $('userRole');
roleEl.textContent = S.user.role;
roleEl.className = 'badge role-' + S.user.role;
}
}
function persistSession() { if (S.user) saveJSON(LS.session, S.user); }
function clearSession() { S.user = null; delJSON(LS.session); }
function forceLogout(msg) {
stopTimer();
Exam.active = null; delJSON(LS.exam);
clearSession();
routePublic();
if (msg) toast(msg, 'warn', 5000);
}
function logout(msg) {
function doLogout() {
if (S.user) {
var id = S.user.id, token = S.user.token;
delJSON(LS.exam);
callServer('logoutUser', id, token).catch(function () {});
}
stopTimer();
Exam.active = null;
clearSession();
routePublic();
toast(msg || 'You have been logged out.', 'info');
}
if (Exam.active) {
confirmDialog({
title: 'Log out during an exam?',
body: 'Your in-progress mock test will be discarded — unanswered questions are not saved.',
danger: true, okText: 'Log out'
}).then(function (yes) { if (yes) doLogout(); });
return;
}
doLogout();
}
/* ---------------- 6. auth ---------------- */
function initAuthEvents() {
 $('linkToRegister').addEventListener('click', function () {
 $('loginCard').classList.add('hidden');
 $('registerCard').classList.remove('hidden');
 $('registerError').textContent = '';
});
 $('linkToLogin').addEventListener('click', function () {
 $('registerCard').classList.add('hidden');
 $('loginCard').classList.remove('hidden');
 $('loginError').textContent = '';
});
 $('formLogin').addEventListener('submit', function (ev) { ev.preventDefault(); doLogin(); });
 $('formRegister').addEventListener('submit', function (ev) { ev.preventDefault(); doRegister(); });
 $('btnLogout').addEventListener('click', function () { logout(); });
 $('brandHome').addEventListener('click', function () {
if (!S.user) { routePublic(); return; }
if (Exam.active) { enterExam(); return; }
routeDashboard();
});
var quickBtns = document.querySelectorAll('#demoCreds [data-fill]');
Array.prototype.forEach.call(quickBtns, function (b) {
b.addEventListener('click', function () {
var which = b.getAttribute('data-fill');
 $('loginEmail').value = which + '@cee.edu';
 $('loginPassword').value = 'demo1234';
 $('loginCard').classList.remove('hidden');
 $('registerCard').classList.add('hidden');
toast('Credentials filled — press "Log in".', 'info');
});
});
try {
var remembered = localStorage.getItem('cee_remember_email');
if (remembered) {
 $('loginEmail').value = remembered;
 $('loginRemember').checked = true;
}
} catch (e) {}
function pwScore(pw) {
var s = 0;
if (pw.length >= 6) s++;
if (pw.length >= 10) s++;
if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
return Math.min(4, s);
}
 $('regPassword').addEventListener('input', function () {
var pw = this.value;
var score = pw ? pwScore(pw) : 0;
var meter = $('pwMeter');
var bars = meter.querySelectorAll('.pw-bar');
var labels = ['Too short — use at least 6 characters', 'Weak — add length or variety', 'Fair — mix in numbers or capitals', 'Good password', 'Strong password'];
var colors = ['', 'var(--danger)', 'var(--warn)', 'var(--accent2)', 'var(--success)'];
Array.prototype.forEach.call(bars, function (b, i) {
b.style.background = i < score ? colors[score] : 'var(--card3)';
});
meter.classList.toggle('has-pw', !!pw);
 $('pwHint').textContent = pw ? labels[score] : '';
 $('pwHint').style.color = pw && colors[score] !== 'var(--card3)' ? colors[score] : 'var(--dim)';
});
}
function doLogin() {
var email = $('loginEmail').value.trim();
var password = $('loginPassword').value;
var errEl = $('loginError');
errEl.textContent = '';
if (!email || !password) { errEl.textContent = 'Enter your email and password.'; return; }
var btn = $('btnLogin');
btn.disabled = true; btn.classList.add('is-loading');
callServer('loginUser', email, password, deviceId())
.then(function (user) {
S.user = user;
persistSession();
try {
if ($('loginRemember').checked) localStorage.setItem('cee_remember_email', email);
else localStorage.removeItem('cee_remember_email');
} catch (e) {}
updateChrome();
toast('Welcome back, ' + user.name + '!', 'success');
afterLoginRoute();
})
.catch(function (e) {
var p = parseErr(e);
if (p.code === 'ACCOUNT_PENDING' || p.code === 'ACCOUNT_REJECTED' || p.code === 'DEVICE_LOCKED') {
errEl.textContent = p.message;
toast(p.message, 'warn', 6000);
} else {
errEl.textContent = p.message;
toast(p.message, 'error');
}
})
.finally(function () { btn.disabled = false; btn.classList.remove('is-loading'); });
}
function doRegister() {
var data = {
name: $('regName').value.trim(),
email: $('regEmail').value.trim(),
username: $('regUsername').value.trim(),
password: $('regPassword').value,
role: $('regRole').value
};
var confirm = $('regConfirm').value;
var errEl = $('registerError');
errEl.textContent = '';
if (data.name.length < 2) { errEl.textContent = 'Please enter your full name.'; return; }
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) { errEl.textContent = 'Please enter a valid email address.'; return; }
if (data.password.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
if (data.password !== confirm) { errEl.textContent = 'Passwords do not match.'; return; }
var btn = $('btnRegister');
btn.disabled = true; btn.classList.add('is-loading');
callServer('registerUser', data)
.then(function (res) {
toast(res.message, res.isFirst ? 'success' : 'info', 6500);
 $('registerCard').classList.add('hidden');
 $('loginCard').classList.remove('hidden');
 $('loginEmail').value = data.email;
 $('loginPassword').value = '';
 $('formRegister').reset();
})
.catch(function (e) {
var p = parseErr(e);
errEl.textContent = p.message;
toast(p.message, 'error');
})
.finally(function () { btn.disabled = false; btn.classList.remove('is-loading'); });
}
function afterLoginRoute() {
var saved = loadJSON(LS.exam, null);
if (saved && saved.userId === S.user.id) {
Exam.active = saved;
if (!saved.durationMin || !saved.deadline) {
enterExam();
toast('Practice session resumed — the clock is still counting up.', 'info');
return;
}
if (Date.now() < saved.deadline - 1500) {
enterExam();
toast('Exam resumed — the clock is still running.', 'warn', 5000);
return;
}
finalizeExam({ auto: true, expiredRestore: true });
return;
}
routeDashboard();
loadDashboard();
}
function loadDashboard() {
if (S.user.role === 'teacher') loadTeacherDash();
else loadStudentDash();
}
