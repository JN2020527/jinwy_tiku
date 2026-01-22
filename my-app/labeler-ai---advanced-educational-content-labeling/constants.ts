
import { Question, KnowledgeNode } from './types';

export const MOCK_QUESTIONS: Question[] = [
  {
    id: '1',
    code: 'PH-23-8840',
    title: 'Calculate the force required to accelerate a 5kg mass at 10m/s².',
    subject: 'Physics',
    status: 'Completed',
    content: 'A mass of 5kg is accelerated at 10m/s². Find the force.',
    equation: 'F = m \times a',
    analysis: {
      formula: 'F = 5 \times 10',
      steps: ['Identify mass m=5kg', 'Identify acceleration a=10m/s²', 'Multiply m and a'],
      result: '50 N'
    },
    tags: ['Mechanics'],
    difficulty: 'Easy',
    year: 2023,
    region: 'International'
  },
  {
    id: '2',
    code: 'PH-23-8841',
    title: 'Determine the wave function of the particle in a box.',
    subject: 'Physics',
    status: 'AI Suggested',
    content: 'Find the normalized wave function for a particle of mass m in an infinite square well of width L.',
    equation: '\psi_n(x) = \sqrt{\frac{2}{L}} \sin(\frac{n\pi x}{L})',
    analysis: {
      formula: '\text{Normalization condition: } \int |\psi|^2 dx = 1',
      steps: ['Apply boundary conditions', 'Normalize the sine function'],
      result: '\psi_n(x)'
    },
    tags: ['Quantum'],
    difficulty: 'Hard',
    year: 2023,
    region: 'International'
  },
  {
    id: '3',
    code: 'PH-23-8842',
    title: 'A particle moves along the x-axis according to x = 2t² - 5t + 1...',
    subject: 'Physics',
    status: 'Active',
    content: 'A particle moves along the x-axis according to the equation x = 2t² - 5t + 1, where x is in meters and t is in seconds. Determine the instantaneous velocity at t = 3s.',
    equation: 'x = 2t^2 - 5t + 1',
    analysis: {
      formula: 'v = dx/dt = d/dt(2t^2 - 5t + 1) = 4t - 5',
      steps: ['Find time derivative of position', 'Substitute t=3s'],
      result: '7 m/s'
    },
    tags: ['Kinematics'],
    difficulty: 'Medium',
    year: 2023,
    region: 'International'
  },
  {
    id: '4',
    code: 'PH-23-8843',
    title: 'Find the total resistance if voltage is 12V and current is 2A.',
    subject: 'Physics',
    status: 'Pending',
    content: 'Calculate R given V=12V and I=2A.',
    equation: 'V = IR',
    analysis: {
      formula: 'R = V/I = 12/2',
      steps: ['Apply Ohms Law'],
      result: '6 \Omega'
    },
    tags: ['Circuits'],
    difficulty: 'Easy',
    year: 2024,
    region: 'North America'
  }
];

export const KNOWLEDGE_GRAPH: KnowledgeNode[] = [
  {
    id: 'phys',
    label: 'Physics',
    type: 'folder',
    icon: 'science',
    children: [
      {
        id: 'mech',
        label: 'Mechanics',
        type: 'folder',
        children: [
          {
            id: 'kin',
            label: 'Kinematics',
            type: 'folder',
            children: [
              { id: 'inst_v', label: 'Instantaneous Velocity', type: 'item', aiMatch: true },
              { id: 'avg_v', label: 'Average Velocity', type: 'item' },
              { id: 'acc', label: 'Acceleration', type: 'item' }
            ]
          },
          { id: 'dyn', label: 'Dynamics', type: 'folder' }
        ]
      },
      { id: 'thermo', label: 'Thermodynamics', type: 'folder' }
    ]
  }
];
