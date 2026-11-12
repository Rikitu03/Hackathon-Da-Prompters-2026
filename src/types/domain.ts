export type PublicationStatus="draft"|"published"|"archived";
export type ScholarshipProgram={id:string;title:string;description:string;status:PublicationStatus};
export type ApplicationCycle={id:string;programId:string;academicYear:string;startDate:string|null;endDate:string|null;status:PublicationStatus};
export type Requirement={id:string;cycleId:string;title:string;description:string;required:boolean;position:number};
export type JourneyStep={id:string;requirementId:string;position:number;instruction:string};
export type ChatRequest={cycleId:string;requirementId?:string;message:string};
export type ChatSource={title:string;sourceId:string;url?:string};
export type ChatResponse={answer:string;sources:ChatSource[];grounded:boolean};
