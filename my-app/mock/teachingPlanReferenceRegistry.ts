let countReferences: (resourceNodeIds: Iterable<string>) => number = () => 0;

export const registerTeachingPlanReferenceCounter = (
  counter: (resourceNodeIds: Iterable<string>) => number,
) => {
  countReferences = counter;
};

export const countTeachingPlanTaskReferences = (
  resourceNodeIds: Iterable<string>,
): number => countReferences(resourceNodeIds);
