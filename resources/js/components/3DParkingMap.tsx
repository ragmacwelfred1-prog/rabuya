// resources/js/components/3DParkingMap.tsx
import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Box, Plane, Cylinder } from '@react-three/drei';
import {
    Button,
    Modal,
    message,
    Tag,
    Space,
    Form,
    Input,
    Select,
    DatePicker,
    TimePicker,
    Row,
    Col,
    Alert,
} from 'antd';
import {
    ThunderboltOutlined,
    CheckCircleOutlined,
    CarOutlined,
    DollarOutlined,
    LoginOutlined,
    UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Option } = Select;

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface ParkingSlot {
    id: number;
    slot_number: string;
    status: 'available' | 'occupied' | 'maintenance';
    nightly_rate: number;
}

interface Customer {
    id: number;
    first_name: string;
    middle_name?: string;
    last_name: string;
    phone_number: string;
    email?: string;
    address?: string;
    plate_number?: string;
    vehicle_model?: string;
}

interface Props {
    slots: ParkingSlot[];
    onSelectSlot?: (slot: ParkingSlot) => void;
    onCheckInSuccess?: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const getSlotNumber = (slot: ParkingSlot): number => {
    const match = slot.slot_number.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
};

const isLeftSlot = (slot: ParkingSlot): boolean => {
    return slot.slot_number.toUpperCase().startsWith('A');
};

const calculateNights = (checkIn: string, checkOut: string): number => {
    return Math.max(
        1,
        dayjs(checkOut)
            .startOf('day')
            .diff(dayjs(checkIn).startOf('day'), 'day'),
    );
};

const fmtPHP = (n?: number | null): string => {
    if (n === undefined || n === null) return '₱0.00';
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
    }).format(n);
};

const CAR_COLORS = [
    '#DC2626', '#2563EB', '#059669', '#D97706', '#7C3AED',
    '#DB2777', '#0891B2', '#EA580C', '#64748B', '#0F172A',
];

const pickCarColor = (id: number): string =>
    CAR_COLORS[Math.abs(id) % CAR_COLORS.length];

const SKIN_TONES = ['#F4C9A1', '#E0AC7E', '#C68B59', '#A47148'];
const SHIRT_COLORS = ['#F59E0B', '#EA580C', '#EF4444', '#0891B2'];
const HELMET_COLORS = ['#FCD34D', '#FB923C', '#F87171', '#FBBF24'];

// ─── Reusable Components ────────────────────────────────────────────────────

const Tree: React.FC<{
    position: [number, number, number];
    scale?: number;
    trunkColor?: string;
    leafColor?: string;
}> = ({
    position,
    scale = 1,
    trunkColor = '#78350F',
    leafColor = '#15803D',
}) => {
    const darkerLeaf = '#166534';
    return (
        <group position={[position[0], 0, position[2]]} scale={scale}>
            <Box args={[0.18, 0.8, 0.18]} position={[0, 0.4, 0]} castShadow>
                <meshStandardMaterial
                    color={trunkColor}
                    roughness={0.9}
                    metalness={0}
                />
            </Box>
            <Box args={[1.0, 0.9, 1.0]} position={[0, 1.15, 0]} castShadow>
                <meshStandardMaterial
                    color={leafColor}
                    roughness={0.8}
                    metalness={0}
                />
            </Box>
            <Box args={[0.8, 0.7, 0.8]} position={[0, 1.75, 0]} castShadow>
                <meshStandardMaterial
                    color={darkerLeaf}
                    roughness={0.8}
                    metalness={0}
                />
            </Box>
            <Box args={[0.5, 0.5, 0.5]} position={[0, 2.2, 0]} castShadow>
                <meshStandardMaterial
                    color={leafColor}
                    roughness={0.8}
                    metalness={0}
                />
            </Box>
        </group>
    );
};

const StreetLight: React.FC<{
    position: [number, number, number];
    armDirection?: 'left' | 'right';
}> = ({ position, armDirection = 'right' }) => {
    // Pole stands outside the fence; the arm reaches IN and UNDER the
    // carport roof line (roofHeight = 2.6) so the fixture lights the
    // slot itself instead of shining onto the top of the roof.
    const reach = armDirection === 'left' ? -1.3 : 1.3;
    const poleHeight = 2.3;
    const headY = poleHeight - 0.34;

    return (
        <group position={[position[0], 0, position[2]]}>
            <Box args={[0.4, 0.15, 0.4]} position={[0, 0.075, 0]}>
                <meshStandardMaterial color="#374151" roughness={0.7} />
            </Box>
            <Box
                args={[0.12, poleHeight, 0.12]}
                position={[0, poleHeight / 2, 0]}
                castShadow
            >
                <meshStandardMaterial
                    color="#4B5563"
                    metalness={0.7}
                    roughness={0.3}
                />
            </Box>
            <Box
                args={[Math.abs(reach), 0.08, 0.08]}
                position={[reach / 2, poleHeight - 0.1, 0]}
            >
                <meshStandardMaterial
                    color="#4B5563"
                    metalness={0.7}
                    roughness={0.3}
                />
            </Box>
            <Box
                args={[0.35, 0.18, 0.35]}
                position={[reach, poleHeight - 0.22, 0]}
            >
                <meshStandardMaterial
                    color="#1F2937"
                    metalness={0.6}
                    roughness={0.3}
                />
            </Box>
            <Box
                args={[0.25, 0.1, 0.25]}
                position={[reach, headY, 0]}
            >
                <meshStandardMaterial
                    color="#FEF3C7"
                    emissive="#FDE68A"
                    emissiveIntensity={1.5}
                    roughness={0.1}
                />
            </Box>
            <pointLight
                position={[reach, headY - 0.05, 0]}
                intensity={0.7}
                distance={4}
                color="#FDE68A"
            />
        </group>
    );
};

const FenceSegment: React.FC<{
    startX: number;
    startZ: number;
    endX: number;
    endZ: number;
    postSpacing?: number;
    height?: number;
    color?: string;
}> = ({
    startX,
    startZ,
    endX,
    endZ,
    postSpacing = 1.0,
    height = 1.0,
    color = '#78716C',
}) => {
    const dx = endX - startX;
    const dz = endZ - startZ;
    const length = Math.sqrt(dx * dx + dz * dz);
    const postCount = Math.max(2, Math.floor(length / postSpacing) + 1);

    const posts = [];
    for (let i = 0; i < postCount; i++) {
        const t = i / (postCount - 1);
        posts.push({
            x: startX + dx * t,
            z: startZ + dz * t,
        });
    }

    const midX = (startX + endX) / 2;
    const midZ = (startZ + endZ) / 2;
    const angle = Math.atan2(dz, dx);

    return (
        <group>
            {posts.map((p, i) => (
                <Box
                    key={`post-${i}`}
                    args={[0.08, height, 0.08]}
                    position={[p.x, height / 2, p.z]}
                    castShadow
                >
                    <meshStandardMaterial
                        color={color}
                        metalness={0.4}
                        roughness={0.6}
                    />
                </Box>
            ))}
            <Box
                args={[length, 0.06, 0.06]}
                position={[midX, height - 0.12, midZ]}
                rotation={[0, -angle, 0]}
                castShadow
            >
                <meshStandardMaterial
                    color={color}
                    metalness={0.4}
                    roughness={0.6}
                />
            </Box>
            <Box
                args={[length, 0.06, 0.06]}
                position={[midX, height * 0.45, midZ]}
                rotation={[0, -angle, 0]}
                castShadow
            >
                <meshStandardMaterial
                    color={color}
                    metalness={0.4}
                    roughness={0.6}
                />
            </Box>
        </group>
    );
};

const GasStation: React.FC<{
    position: [number, number, number];
    rotationY?: number;
}> = ({ position, rotationY = Math.PI }) => {
    const canopyHeight = 2.6;
    const canopyWidth = 4.5;
    const canopyDepth = 3.2;

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <Box args={[5.5, 0.15, 4]} position={[0, 0.075, 0]} receiveShadow>
                <meshStandardMaterial color="#9CA3AF" roughness={0.9} />
            </Box>

            {[
                [-canopyWidth / 2 + 0.3, -canopyDepth / 2 + 0.3],
                [canopyWidth / 2 - 0.3, -canopyDepth / 2 + 0.3],
                [-canopyWidth / 2 + 0.3, canopyDepth / 2 - 0.3],
                [canopyWidth / 2 - 0.3, canopyDepth / 2 - 0.3],
            ].map(([x, z], i) => (
                <Cylinder
                    key={`pole-${i}`}
                    args={[0.12, 0.12, canopyHeight, 12]}
                    position={[x, canopyHeight / 2 + 0.15, z]}
                    castShadow
                >
                    <meshStandardMaterial
                        color="#E5E7EB"
                        metalness={0.6}
                        roughness={0.3}
                    />
                </Cylinder>
            ))}

            <Box
                args={[canopyWidth, 0.35, canopyDepth]}
                position={[0, canopyHeight + 0.35, 0]}
                castShadow
            >
                <meshStandardMaterial
                    color="#DC2626"
                    roughness={0.5}
                    metalness={0.2}
                />
            </Box>

            <Box
                args={[canopyWidth + 0.2, 0.12, canopyDepth + 0.2]}
                position={[0, canopyHeight + 0.14, 0]}
            >
                <meshStandardMaterial
                    color="#F9FAFB"
                    roughness={0.4}
                    metalness={0.2}
                />
            </Box>

            <group position={[0, canopyHeight + 0.55, canopyDepth / 2 + 0.05]}>
                <Box args={[2.2, 0.5, 0.08]}>
                    <meshStandardMaterial
                        color="#DC2626"
                        emissive="#DC2626"
                        emissiveIntensity={0.3}
                    />
                </Box>
                <Text
                    position={[0, 0, 0.07]}
                    fontSize={0.22}
                    color="#FFFFFF"
                    anchorX="center"
                    anchorY="middle"
                    fontWeight="bold"
                >
                    FUEL
                </Text>
            </group>

            {[-1.3, 1.3].map((x, i) => (
                <group key={`pump-${i}`} position={[x, 0, 0]}>
                    <Box
                        args={[0.7, 1.3, 0.5]}
                        position={[0, 0.8, 0]}
                        castShadow
                    >
                        <meshStandardMaterial
                            color="#DC2626"
                            roughness={0.5}
                            metalness={0.3}
                        />
                    </Box>
                    <Box args={[0.5, 0.3, 0.05]} position={[0, 1.15, 0.27]}>
                        <meshStandardMaterial
                            color="#0F172A"
                            emissive="#10B981"
                            emissiveIntensity={0.5}
                        />
                    </Box>
                    <Box args={[0.7, 0.1, 0.5]} position={[0, 0.35, 0]}>
                        <meshStandardMaterial color="#1F2937" />
                    </Box>
                </group>
            ))}

            <group position={[0, 0, -canopyDepth / 2 - 1.3]}>
                <Box
                    args={[4.5, 2.2, 2.4]}
                    position={[0, 1.1, 0]}
                    castShadow
                    receiveShadow
                >
                    <meshStandardMaterial
                        color="#F9FAFB"
                        roughness={0.7}
                        metalness={0.1}
                    />
                </Box>
                <Box args={[4.7, 0.25, 2.6]} position={[0, 2.3, 0]}>
                    <meshStandardMaterial
                        color="#1E40AF"
                        roughness={0.5}
                        metalness={0.2}
                    />
                </Box>
                {[-1.4, 0, 1.4].map((x, i) => (
                    <Box
                        key={`store-win-${i}`}
                        args={[1.0, 0.9, 0.05]}
                        position={[x, 1.4, 1.22]}
                    >
                        <meshStandardMaterial
                            color="#BAE6FD"
                            emissive="#7DD3FC"
                            emissiveIntensity={0.6}
                            roughness={0.2}
                        />
                    </Box>
                ))}
                <Box args={[0.8, 1.5, 0.05]} position={[0, 0.75, 1.22]}>
                    <meshStandardMaterial
                        color="#475569"
                        roughness={0.6}
                        metalness={0.3}
                    />
                </Box>

                <group position={[0, 2.6, 1.22]}>
                    <Box args={[3.8, 0.4, 0.08]}>
                        <meshStandardMaterial
                            color="#1E40AF"
                            emissive="#1E40AF"
                            emissiveIntensity={0.4}
                        />
                    </Box>
                    <Text
                        position={[0, 0, 0.07]}
                        fontSize={0.2}
                        color="#FFFFFF"
                        anchorX="center"
                        anchorY="middle"
                        fontWeight="bold"
                    >
                        RABUYA FUEL STATION
                    </Text>
                </group>
            </group>
        </group>
    );
};



/**
 * ✅ UPDATED: EntranceGate now has a BIG "RABUYA PARKING" sign
 * mounted on the FRONT of the beam so it faces the camera / highway.
 */
const EntranceGate: React.FC<{
    position: [number, number, number];
}> = ({ position }) => {
    return (
        <group position={position}>
            {/* Left pillar */}
            <Box args={[0.5, 3, 0.5]} position={[-2, 1.5, 0]} castShadow>
                <meshStandardMaterial
                    color="#E5E7EB"
                    roughness={0.7}
                    metalness={0.2}
                />
            </Box>
            <Box args={[0.65, 0.25, 0.65]} position={[-2, 3.05, 0]}>
                <meshStandardMaterial color="#9CA3AF" />
            </Box>

            {/* Right pillar */}
            <Box args={[0.5, 3, 0.5]} position={[2, 1.5, 0]} castShadow>
                <meshStandardMaterial
                    color="#E5E7EB"
                    roughness={0.7}
                    metalness={0.2}
                />
            </Box>
            <Box args={[0.65, 0.25, 0.65]} position={[2, 3.05, 0]}>
                <meshStandardMaterial color="#9CA3AF" />
            </Box>

            {/* Top beam */}
            <Box args={[4.5, 0.45, 0.55]} position={[0, 3.05, 0]} castShadow>
                <meshStandardMaterial
                    color="#1E293B"
                    roughness={0.5}
                    metalness={0.4}
                />
            </Box>

            {/* Big signboard mounted on the HIGHWAY-facing side of the beam */}
            <group position={[0, 3.05, -0.35]} rotation={[0, Math.PI, 0]}>
                {/* Sign background */}
                <Box
                    args={[4.2, 1.0, 0.08]}
                    position={[0, 0, 0]}
                    castShadow
                >
                    <meshStandardMaterial
                        color="#0F172A"
                        roughness={0.5}
                        metalness={0.4}
                        emissive="#1E293B"
                        emissiveIntensity={0.2}
                    />
                </Box>

                {/* Yellow accent border (top) */}
                <Box
                    args={[4.2, 0.06, 0.1]}
                    position={[0, 0.5, 0]}
                >
                    <meshStandardMaterial
                        color="#FBBF24"
                        emissive="#FBBF24"
                        emissiveIntensity={0.4}
                    />
                </Box>

                {/* Yellow accent border (bottom) */}
                <Box
                    args={[4.2, 0.06, 0.1]}
                    position={[0, -0.5, 0]}
                >
                    <meshStandardMaterial
                        color="#FBBF24"
                        emissive="#FBBF24"
                        emissiveIntensity={0.4}
                    />
                </Box>

                {/* "RABUYA PARKING" text — faces outward toward the highway */}
                <Text
                    position={[0, 0, 0.06]}
                    fontSize={0.42}
                    color="#FBBF24"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.02}
                    outlineColor="#000"
                    fontWeight="bold"
                    letterSpacing={0.05}
                >
                    RABUYA PARKING
                </Text>
            </group>

            {/* Red/yellow barrier stripes */}
            {[-1.4, -0.7, 0, 0.7, 1.4].map((x, i) => (
                <Box
                    key={`barrier-${i}`}
                    args={[0.65, 0.15, 0.1]}
                    position={[x, 1.1, 0]}
                    rotation={[0, 0, i % 2 === 0 ? 0.15 : -0.15]}
                >
                    <meshStandardMaterial
                        color={i % 2 === 0 ? '#EF4444' : '#FCD34D'}
                        roughness={0.5}
                        metalness={0.2}
                    />
                </Box>
            ))}
        </group>
    );
};

// ─── 3D Car ─────────────────────────────────────────────────────────────────

const Car: React.FC<{
    color?: string;
    rotationY?: number;
    position?: [number, number, number];
}> = ({ color = '#DC2626', rotationY = 0, position = [0, 0, 0] }) => {
    const bodyLength = 2.2;
    const bodyWidth = 1.0;
    const bodyHeight = 0.55;
    const bodyY = 0.3;

    const cabinLength = 1.1;
    const cabinWidth = 0.85;
    const cabinHeight = 0.45;
    const cabinY = bodyY + bodyHeight / 2 + cabinHeight / 2;

    const wheelRadius = 0.16;
    const wheelWidth = 0.12;
    const wheelZ = bodyLength / 2 - 0.4;
    const wheelX = bodyWidth / 2 + 0.02;
    const wheelY = wheelRadius;

    const darkGlass = '#0F172A';
    const tireColor = '#111827';
    const hubColor = '#9CA3AF';
    const lightColor = '#FEF3C7';

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <Box
                args={[bodyWidth, bodyHeight, bodyLength]}
                position={[0, bodyY, 0]}
                castShadow
            >
                <meshStandardMaterial
                    color={color}
                    roughness={0.35}
                    metalness={0.5}
                />
            </Box>

            <Box
                args={[cabinWidth, cabinHeight, cabinLength]}
                position={[0, cabinY, 0]}
                castShadow
            >
                <meshStandardMaterial
                    color={color}
                    roughness={0.35}
                    metalness={0.5}
                />
            </Box>

            <Box
                args={[cabinWidth - 0.05, cabinHeight - 0.08, 0.02]}
                position={[0, cabinY, cabinLength / 2 + 0.01]}
            >
                <meshStandardMaterial
                    color={darkGlass}
                    roughness={0.1}
                    metalness={0.8}
                />
            </Box>

            <Box
                args={[cabinWidth - 0.05, cabinHeight - 0.08, 0.02]}
                position={[0, cabinY, -cabinLength / 2 - 0.01]}
            >
                <meshStandardMaterial
                    color={darkGlass}
                    roughness={0.1}
                    metalness={0.8}
                />
            </Box>

            {[-1, 1].map((side) => (
                <Box
                    key={`side-window-${side}`}
                    args={[0.02, cabinHeight - 0.1, cabinLength - 0.15]}
                    position={[
                        side * (cabinWidth / 2 + 0.01),
                        cabinY,
                        0,
                    ]}
                >
                    <meshStandardMaterial
                        color={darkGlass}
                        roughness={0.1}
                        metalness={0.8}
                    />
                </Box>
            ))}

            {[
                [-wheelX, wheelZ],
                [wheelX, wheelZ],
                [-wheelX, -wheelZ],
                [wheelX, -wheelZ],
            ].map(([x, z], i) => (
                <group key={`wheel-${i}`} position={[x, wheelY, z]}>
                    <Cylinder
                        args={[wheelRadius, wheelRadius, wheelWidth, 16]}
                        rotation={[0, 0, Math.PI / 2]}
                        castShadow
                    >
                        <meshStandardMaterial
                            color={tireColor}
                            roughness={0.9}
                            metalness={0.1}
                        />
                    </Cylinder>
                    <Cylinder
                        args={[
                            wheelRadius * 0.5,
                            wheelRadius * 0.5,
                            wheelWidth + 0.02,
                            16,
                        ]}
                        rotation={[0, 0, Math.PI / 2]}
                    >
                        <meshStandardMaterial
                            color={hubColor}
                            roughness={0.4}
                            metalness={0.7}
                        />
                    </Cylinder>
                </group>
            ))}

            {[-1, 1].map((side) => (
                <Box
                    key={`headlight-${side}`}
                    args={[0.16, 0.1, 0.04]}
                    position={[
                        side * (bodyWidth / 2 - 0.22),
                        bodyY + 0.05,
                        bodyLength / 2 + 0.01,
                    ]}
                >
                    <meshStandardMaterial
                        color={lightColor}
                        emissive={lightColor}
                        emissiveIntensity={0.7}
                        roughness={0.2}
                    />
                </Box>
            ))}

            {[-1, 1].map((side) => (
                <Box
                    key={`taillight-${side}`}
                    args={[0.14, 0.08, 0.04]}
                    position={[
                        side * (bodyWidth / 2 - 0.22),
                        bodyY + 0.05,
                        -bodyLength / 2 - 0.01,
                    ]}
                >
                    <meshStandardMaterial
                        color="#EF4444"
                        emissive="#DC2626"
                        emissiveIntensity={0.6}
                        roughness={0.3}
                    />
                </Box>
            ))}

            <Box
                args={[cabinWidth * 0.6, 0.02, cabinLength * 0.6]}
                position={[0, cabinY + cabinHeight / 2 + 0.01, 0]}
            >
                <meshStandardMaterial
                    color="#111827"
                    roughness={0.6}
                    metalness={0.3}
                />
            </Box>
        </group>
    );
};

// ─── Maintenance Worker ─────────────────────────────────────────────────────

const MaintenanceWorker: React.FC<{
    position: [number, number, number];
    rotationY?: number;
    variant?: number;
    tool?: 'hammer' | 'wrench' | 'shovel' | 'drill' | 'none';
    working?: boolean;
}> = ({
    position,
    rotationY = 0,
    variant = 0,
    tool = 'hammer',
    working = false,
}) => {
    const skin = SKIN_TONES[variant % SKIN_TONES.length];
    const shirt = SHIRT_COLORS[variant % SHIRT_COLORS.length];
    const helmet = HELMET_COLORS[variant % HELMET_COLORS.length];
    const pants = '#1E3A8A';
    const boots = '#1F2937';

    const headR = 0.11;
    const torsoW = 0.26;
    const torsoH = 0.42;
    const legH = 0.5;
    const armL = 0.32;
    const armW = 0.07;

    const bootY = 0.05;
    const legY = legH / 2 + bootY;
    const torsoY = legH + bootY + torsoH / 2;
    const headY = torsoY + torsoH / 2 + headR + 0.02;
    const helmetY = headY + headR * 0.55;
    const shoulderY = torsoY + torsoH / 2 - 0.08;
    const armAngle = working ? -Math.PI / 3 : 0;

    return (
        <group
            position={[position[0], 0, position[2]]}
            rotation={[0, rotationY, 0]}
        >
            {[-1, 1].map((side) => (
                <group key={`leg-${side}`}>
                    <Box
                        args={[0.1, legH, 0.1]}
                        position={[side * 0.08, legY, 0]}
                        castShadow
                    >
                        <meshStandardMaterial
                            color={pants}
                            roughness={0.8}
                        />
                    </Box>
                    <Box
                        args={[0.13, 0.09, 0.18]}
                        position={[side * 0.08, bootY, 0.02]}
                        castShadow
                    >
                        <meshStandardMaterial
                            color={boots}
                            roughness={0.9}
                        />
                    </Box>
                </group>
            ))}

            <Box
                args={[torsoW, torsoH, 0.16]}
                position={[0, torsoY, 0]}
                castShadow
            >
                <meshStandardMaterial color={shirt} roughness={0.7} />
            </Box>

            <Box
                args={[torsoW + 0.01, 0.05, 0.165]}
                position={[0, torsoY + 0.05, 0]}
            >
                <meshStandardMaterial
                    color="#FCD34D"
                    emissive="#FCD34D"
                    emissiveIntensity={0.4}
                    roughness={0.4}
                />
            </Box>
            <Box
                args={[torsoW + 0.01, 0.05, 0.165]}
                position={[0, torsoY - 0.08, 0]}
            >
                <meshStandardMaterial
                    color="#FCD34D"
                    emissive="#FCD34D"
                    emissiveIntensity={0.4}
                    roughness={0.4}
                />
            </Box>

            {[-1, 1].map((side) => {
                const isWorkingArm = side === 1 && working;
                const rotation: [number, number, number] = isWorkingArm
                    ? [0, 0, armAngle]
                    : [0, 0, 0];
                const armX = side * (torsoW / 2 + armW / 2 + 0.01);
                const armYOff = isWorkingArm ? 0.08 : -armL / 2 + 0.02;

                return (
                    <group
                        key={`arm-${side}`}
                        position={[
                            armX,
                            shoulderY + armYOff,
                            0,
                        ]}
                        rotation={rotation}
                    >
                        <Box
                            args={[armW, armL, armW]}
                            position={[0, 0, 0]}
                            castShadow
                        >
                            <meshStandardMaterial
                                color={shirt}
                                roughness={0.7}
                            />
                        </Box>
                        <Box
                            args={[armW + 0.02, 0.06, armW + 0.02]}
                            position={[0, armL / 2 + 0.03, 0]}
                        >
                            <meshStandardMaterial
                                color={skin}
                                roughness={0.85}
                            />
                        </Box>

                        {isWorkingArm && tool === 'hammer' && (
                            <group position={[0, armL / 2 + 0.1, 0]}>
                                <Box
                                    args={[0.03, 0.22, 0.03]}
                                    position={[0, 0, 0]}
                                >
                                    <meshStandardMaterial color="#78350F" />
                                </Box>
                                <Box
                                    args={[0.14, 0.06, 0.05]}
                                    position={[0, 0.13, 0]}
                                >
                                    <meshStandardMaterial
                                        color="#374151"
                                        metalness={0.7}
                                        roughness={0.3}
                                    />
                                </Box>
                            </group>
                        )}

                        {isWorkingArm && tool === 'wrench' && (
                            <group position={[0, armL / 2 + 0.1, 0]}>
                                <Box
                                    args={[0.04, 0.22, 0.04]}
                                    position={[0, 0, 0]}
                                >
                                    <meshStandardMaterial
                                        color="#9CA3AF"
                                        metalness={0.8}
                                        roughness={0.3}
                                    />
                                </Box>
                                <Box
                                    args={[0.1, 0.04, 0.04]}
                                    position={[0, 0.12, 0]}
                                >
                                    <meshStandardMaterial
                                        color="#9CA3AF"
                                        metalness={0.8}
                                        roughness={0.3}
                                    />
                                </Box>
                            </group>
                        )}

                        {isWorkingArm && tool === 'shovel' && (
                            <group position={[0, armL / 2 + 0.1, 0]}>
                                <Box
                                    args={[0.03, 0.3, 0.03]}
                                    position={[0, 0, 0]}
                                >
                                    <meshStandardMaterial color="#78350F" />
                                </Box>
                                <Box
                                    args={[0.14, 0.14, 0.03]}
                                    position={[0, -0.15, 0]}
                                >
                                    <meshStandardMaterial
                                        color="#9CA3AF"
                                        metalness={0.6}
                                        roughness={0.4}
                                    />
                                </Box>
                            </group>
                        )}

                        {isWorkingArm && tool === 'drill' && (
                            <group position={[0, armL / 2 + 0.1, 0]}>
                                <Box
                                    args={[0.08, 0.14, 0.08]}
                                    position={[0, 0, 0]}
                                >
                                    <meshStandardMaterial
                                        color="#DC2626"
                                        roughness={0.5}
                                    />
                                </Box>
                                <Box
                                    args={[0.02, 0.12, 0.02]}
                                    position={[0, -0.13, 0]}
                                >
                                    <meshStandardMaterial
                                        color="#374151"
                                        metalness={0.7}
                                    />
                                </Box>
                            </group>
                        )}
                    </group>
                );
            })}

            <Box
                args={[headR * 2, headR * 2, headR * 2]}
                position={[0, headY, 0]}
                castShadow
            >
                <meshStandardMaterial color={skin} roughness={0.85} />
            </Box>

            <Box
                args={[headR * 2.3, headR * 0.9, headR * 2.3]}
                position={[0, helmetY, 0]}
                castShadow
            >
                <meshStandardMaterial
                    color={helmet}
                    roughness={0.4}
                    metalness={0.2}
                />
            </Box>
            <Box
                args={[headR * 2.6, 0.02, headR * 2.6]}
                position={[0, helmetY - headR * 0.45, 0]}
            >
                <meshStandardMaterial
                    color={helmet}
                    roughness={0.4}
                    metalness={0.2}
                />
            </Box>
        </group>
    );
};

// ─── Construction Props ─────────────────────────────────────────────────────

const TrafficCone: React.FC<{
    position: [number, number, number];
}> = ({ position }) => (
    <group position={position}>
        <Box args={[0.16, 0.03, 0.16]} position={[0, 0.015, 0]}>
            <meshStandardMaterial color="#111827" roughness={0.8} />
        </Box>
        <Box args={[0.13, 0.04, 0.13]} position={[0, 0.05, 0]}>
            <meshStandardMaterial
                color="#EA580C"
                emissive="#EA580C"
                emissiveIntensity={0.2}
            />
        </Box>
        <Box args={[0.11, 0.04, 0.11]} position={[0, 0.09, 0]}>
            <meshStandardMaterial color="#F9FAFB" />
        </Box>
        <Box args={[0.09, 0.04, 0.09]} position={[0, 0.13, 0]}>
            <meshStandardMaterial
                color="#EA580C"
                emissive="#EA580C"
                emissiveIntensity={0.2}
            />
        </Box>
        <Box args={[0.07, 0.04, 0.07]} position={[0, 0.17, 0]}>
            <meshStandardMaterial color="#F9FAFB" />
        </Box>
        <Box args={[0.05, 0.03, 0.05]} position={[0, 0.205, 0]}>
            <meshStandardMaterial color="#EA580C" />
        </Box>
    </group>
);

const CementBag: React.FC<{
    position: [number, number, number];
    rotationY?: number;
}> = ({ position, rotationY = 0 }) => (
    <group position={position} rotation={[0, rotationY, 0]}>
        <Box
            args={[0.3, 0.1, 0.18]}
            position={[0, 0.05, 0]}
            castShadow
        >
            <meshStandardMaterial color="#A16207" roughness={0.9} />
        </Box>
        <Box args={[0.28, 0.02, 0.16]} position={[0, 0.11, 0]}>
            <meshStandardMaterial color="#FEF3C7" />
        </Box>
    </group>
);

const Ladder: React.FC<{
    position: [number, number, number];
    rotationY?: number;
}> = ({ position, rotationY = 0 }) => (
    <group position={position} rotation={[0, rotationY, 0]}>
        {[-1, 1].map((side) => (
            <Box
                key={`rail-${side}`}
                args={[0.03, 0.9, 0.03]}
                position={[side * 0.09, 0.45, 0]}
                castShadow
            >
                <meshStandardMaterial color="#92400E" roughness={0.8} />
            </Box>
        ))}
        {[0.15, 0.35, 0.55, 0.75].map((y) => (
            <Box
                key={`rung-${y}`}
                args={[0.21, 0.025, 0.025]}
                position={[0, y, 0]}
            >
                <meshStandardMaterial color="#B45309" roughness={0.8} />
            </Box>
        ))}
    </group>
);

const Toolbox: React.FC<{
    position: [number, number, number];
    color?: string;
}> = ({ position, color = '#DC2626' }) => (
    <group position={position}>
        <Box args={[0.28, 0.14, 0.14]} position={[0, 0.07, 0]} castShadow>
            <meshStandardMaterial
                color={color}
                roughness={0.5}
                metalness={0.3}
            />
        </Box>
        <Box args={[0.1, 0.02, 0.02]} position={[0, 0.15, 0]}>
            <meshStandardMaterial color="#111827" />
        </Box>
    </group>
);

const ConstructionProps: React.FC<{
    slotWidth: number;
    slotLength: number;
    seed: number;
}> = ({ slotWidth, slotLength, seed }) => {
    const variant = seed % 3;

    return (
        <group>
            <TrafficCone
                position={[
                    -slotWidth / 2 + 0.25,
                    0.06,
                    -slotLength / 2 + 0.25,
                ]}
            />
            <TrafficCone
                position={[
                    slotWidth / 2 - 0.25,
                    0.06,
                    -slotLength / 2 + 0.25,
                ]}
            />

            <CementBag
                position={[
                    -slotWidth / 2 + 0.35,
                    0.06,
                    slotLength / 2 - 0.4,
                ]}
                rotationY={variant * 0.3}
            />
            <CementBag
                position={[
                    -slotWidth / 2 + 0.4,
                    0.16,
                    slotLength / 2 - 0.4,
                ]}
                rotationY={variant * 0.5}
            />
            <CementBag
                position={[
                    -slotWidth / 2 + 0.35,
                    0.06,
                    slotLength / 2 - 0.15,
                ]}
                rotationY={-variant * 0.2}
            />

            {variant !== 1 && (
                <Ladder
                    position={[
                        slotWidth / 2 - 0.3,
                        0.06,
                        slotLength / 2 - 0.5,
                    ]}
                    rotationY={-0.2}
                />
            )}

            <Toolbox
                position={[
                    slotWidth / 2 - 0.35,
                    0.06,
                    0,
                ]}
                color={variant === 0 ? '#DC2626' : variant === 1 ? '#EA580C' : '#0891B2'}
            />

            <group
                position={[
                    -slotWidth / 2 + 0.5,
                    0.06,
                    0.1,
                ]}
                rotation={[0, 0.6, 0]}
            >
                <Box args={[0.02, 0.18, 0.02]} position={[0, 0.09, 0]}>
                    <meshStandardMaterial color="#78350F" />
                </Box>
                <Box args={[0.1, 0.05, 0.04]} position={[0, 0.19, 0]}>
                    <meshStandardMaterial
                        color="#374151"
                        metalness={0.7}
                        roughness={0.3}
                    />
                </Box>
            </group>
        </group>
    );
};

// ─── Realistic Parking Slot with Roof ───────────────────────────────────────

const ParkingSlotWithRoof: React.FC<{
    slot: ParkingSlot;
    position: [number, number, number];
    side: 'left' | 'right';
    onClick: () => void;
}> = ({ slot, position, side, onClick }) => {
    const [hovered, setHovered] = useState(false);

    const slotWidth = 1.6;
    const slotLength = 2.8;
    const lineThickness = 0.08;
    const roofHeight = 2.6;
    const roofThickness = 0.12;

    const statusTint =
        slot.status === 'available'
            ? '#10B981'
            : slot.status === 'occupied'
              ? '#F59E0B'
              : '#EF4444';

    const lineColor = '#E5E7EB';
    const carColor = pickCarColor(slot.id);

    return (
        <group position={[position[0], 0, position[2]]}>
            <Box
                args={[slotWidth, 0.06, slotLength]}
                position={[0, 0.03, 0]}
                onClick={onClick}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                    setHovered(false);
                    document.body.style.cursor = 'default';
                }}
                receiveShadow
            >
                <meshStandardMaterial
                    color={statusTint}
                    roughness={0.85}
                    metalness={0.05}
                    emissive={statusTint}
                    emissiveIntensity={hovered ? 0.35 : 0.12}
                    transparent
                    opacity={hovered ? 0.9 : 0.75}
                />
            </Box>

            <Box
                args={[slotWidth, 0.09, lineThickness]}
                position={[0, 0.045, slotLength / 2 - lineThickness / 2]}
            >
                <meshStandardMaterial color={lineColor} roughness={0.9} />
            </Box>
            <Box
                args={[slotWidth, 0.09, lineThickness]}
                position={[0, 0.045, -slotLength / 2 + lineThickness / 2]}
            >
                <meshStandardMaterial color={lineColor} roughness={0.9} />
            </Box>
            <Box
                args={[lineThickness, 0.09, slotLength]}
                position={[-slotWidth / 2 + lineThickness / 2, 0.045, 0]}
            >
                <meshStandardMaterial color={lineColor} roughness={0.9} />
            </Box>
            <Box
                args={[lineThickness, 0.09, slotLength]}
                position={[slotWidth / 2 - lineThickness / 2, 0.045, 0]}
            >
                <meshStandardMaterial color={lineColor} roughness={0.9} />
            </Box>

            <Text
                position={[0, 0.075, 0]}
                fontSize={0.55}
                color="#FFFFFF"
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
                rotation={[-Math.PI / 2, 0, side === 'left' ? Math.PI : 0]}
                outlineWidth={0.012}
                outlineColor="#000"
            >
                {slot.slot_number}
            </Text>

            {slot.status === 'occupied' && (
                <Car
                    color={carColor}
                    rotationY={0}
                    position={[0, 0.06, 0]}
                />
            )}

            {slot.status === 'maintenance' && (
                <>
                    <Box
                        args={[slotWidth - 0.2, 0.02, slotLength - 0.2]}
                        position={[0, 0.08, 0]}
                    >
                        <meshStandardMaterial
                            color="#000000"
                            opacity={0.15}
                            transparent
                        />
                    </Box>

                    <MaintenanceWorker
                        position={[0.28, 0.06, 0.55]}
                        rotationY={-0.7}
                        variant={slot.id % 4}
                        tool="hammer"
                        working
                    />

                    <MaintenanceWorker
                        position={[-0.3, 0.06, -0.5]}
                        rotationY={0.9}
                        variant={(slot.id + 1) % 4}
                        tool="wrench"
                        working
                    />

                    {slot.id % 2 === 0 && (
                        <MaintenanceWorker
                            position={[0.35, 0.06, -0.15]}
                            rotationY={2.2}
                            variant={(slot.id + 2) % 4}
                            tool="drill"
                            working={false}
                        />
                    )}

                    <ConstructionProps
                        slotWidth={slotWidth}
                        slotLength={slotLength}
                        seed={slot.id}
                    />
                </>
            )}

            <group position={[0, roofHeight, 0]}>
                {[
                    [-slotWidth / 2 + 0.1, -slotLength / 2 + 0.1],
                    [slotWidth / 2 - 0.1, -slotLength / 2 + 0.1],
                    [-slotWidth / 2 + 0.1, slotLength / 2 - 0.1],
                    [slotWidth / 2 - 0.1, slotLength / 2 - 0.1],
                ].map(([x, z], i) => (
                    <Box
                        key={`roof-pole-${i}`}
                        args={[0.08, roofHeight, 0.08]}
                        position={[x, -roofHeight / 2, z]}
                        castShadow
                    >
                        <meshStandardMaterial
                            color="#9CA3AF"
                            metalness={0.7}
                            roughness={0.35}
                        />
                    </Box>
                ))}

                <Box
                    args={[slotWidth + 0.15, roofThickness, slotLength + 0.15]}
                    position={[0, 0, 0]}
                    castShadow
                    receiveShadow
                >
                    <meshStandardMaterial
                        color="#475569"
                        roughness={0.5}
                        metalness={0.4}
                    />
                </Box>

                <Box
                    args={[slotWidth + 0.1, 0.02, slotLength + 0.1]}
                    position={[0, -roofThickness / 2 - 0.01, 0]}
                >
                    <meshStandardMaterial
                        color="#94A3B8"
                        roughness={0.6}
                        metalness={0.3}
                    />
                </Box>

                <Box
                    args={[slotWidth + 0.15, 0.08, 0.05]}
                    position={[
                        0,
                        -roofThickness / 2 - 0.04,
                        slotLength / 2 + 0.05,
                    ]}
                >
                    <meshStandardMaterial
                        color="#3B82F6"
                        emissive="#3B82F6"
                        emissiveIntensity={0.3}
                    />
                </Box>
            </group>
        </group>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────

export const ParkingMap3D: React.FC<Props> = ({
    slots,
    onSelectSlot,
    onCheckInSuccess,
}) => {
    const [bookModalVisible, setBookModalVisible] = useState(false);
    const [preselectedSlot, setPreselectedSlot] = useState<ParkingSlot | null>(
        null,
    );
    const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);

    const [checkinModal, setCheckinModal] = useState(false);
    const [checkinForm] = Form.useForm();
    const [checkingIn, setCheckingIn] = useState(false);
    const [prefillSlot, setPrefillSlot] = useState<ParkingSlot | null>(null);

    const [searchCustModal, setSearchCustModal] = useState(false);
    const [searchKW, setSearchKW] = useState('');
    const [searchResults, setSearchResults] = useState<Customer[]>([]);
    const [searching, setSearching] = useState(false);

    const leftSlotsRaw = slots.filter((s) => isLeftSlot(s));
    const rightSlotsRaw = slots.filter((s) => !isLeftSlot(s));
    const leftSlots = [...leftSlotsRaw].sort(
        (a, b) => getSlotNumber(a) - getSlotNumber(b),
    );
    const rightSlots = [...rightSlotsRaw].sort(
        (a, b) => getSlotNumber(a) - getSlotNumber(b),
    );
    const finalLeft = leftSlots.slice(0, 8);
    const finalRight = rightSlots.slice(0, 8);

    const slotWidth = 1.6;
    const slotLength = 2.8;
    const walkwayWidth = 2.4;
    const margin = 0.4;

    const leftCenter = -(walkwayWidth / 2 + margin + slotWidth / 2);
    const rightCenter = +(walkwayWidth / 2 + margin + slotWidth / 2);
    const leftStartX = leftCenter;
    const rightStartX = rightCenter;

    const spacingZ = 3.0;
    const startZ = -4.0;
    const endZ =
        startZ +
        (Math.max(finalLeft.length, finalRight.length) - 1) * spacingZ;

    const entranceZ = -8.0;

    const gasStationX = 8.5;
    const gasStationZ = -10.5;

    // (the side away from the pump islands / road frontage), offset to
    // the side so it never encroaches on the entrance or the slot rows.


    const sidewalkWidth = 1.4;
    const sidewalkZ = -14.5;

    const roadWidth = 4.0;
    const roadLength = Math.abs(leftStartX) * 2 + 50;
    const roadZ = -18.5;

    const floorWidth =
        Math.abs(leftStartX) + Math.abs(rightStartX) + slotWidth + 2;
    const floorLength = Math.abs(startZ - endZ) + 10;

    const leftFenceX = leftStartX - slotWidth / 2 - 0.15;
    const rightFenceX = rightStartX + slotWidth / 2 + 0.15;
    const frontFenceZ = startZ - slotLength / 2 - 0.15;
    const backFenceZ = endZ + slotLength / 2 + 0.15;

    const bookableSlots = slots.filter((s) => s.status === 'available');
    const availSlots = bookableSlots;

    const handleSlotClick = (slot: ParkingSlot) => {
        if (onSelectSlot) {
            onSelectSlot(slot);
            return;
        }
        if (slot.status === 'maintenance') {
            message.warning(
                `Slot ${slot.slot_number} is under maintenance and cannot be booked.`,
            );
            return;
        }
        if (slot.status === 'occupied') {
            message.warning(
                `Slot ${slot.slot_number} is currently occupied. Please choose another slot.`,
            );
            return;
        }
        openCheckinForSlot(slot);
    };

    const openCheckinForSlot = (slot: ParkingSlot) => {
        if (slot.status !== 'available') {
            message.warning(`Slot ${slot.slot_number} is not available.`);
            return;
        }
        checkinForm.resetFields();
        checkinForm.setFieldsValue({
            check_in_date: dayjs(),
            check_in_time: dayjs('14:00', 'HH:mm'),
            expected_checkout_date: dayjs().add(1, 'day'),
            expected_checkout_time: dayjs('12:00', 'HH:mm'),
            parking_slot_id: slot.id,
        });
        setPrefillSlot(slot);
        setCheckinModal(true);
    };

    const resetCheckinForm = () => {
        setPrefillSlot(null);
        checkinForm.resetFields();
        checkinForm.setFieldsValue({
            check_in_date: dayjs(),
            check_in_time: dayjs('14:00', 'HH:mm'),
            expected_checkout_date: dayjs().add(1, 'day'),
            expected_checkout_time: dayjs('12:00', 'HH:mm'),
        });
    };

    const handleProceed = () => {
        if (!preselectedSlot) return;
        if (preselectedSlot.status !== 'available') {
            message.warning('This slot is not available.');
            return;
        }
        setBookModalVisible(false);
        openCheckinForSlot(preselectedSlot);
    };

    const handleCheckin = async (values: any) => {
        setCheckingIn(true);
        try {
            const ci = dayjs(
                `${values.check_in_date.format('YYYY-MM-DD')} ${values.check_in_time.format('HH:mm:ss')}`,
            );
            const co = dayjs(
                `${values.expected_checkout_date.format('YYYY-MM-DD')} ${values.expected_checkout_time.format('HH:mm:ss')}`,
            );
            const n = calculateNights(
                ci.format('YYYY-MM-DD'),
                co.format('YYYY-MM-DD'),
            );
            const rate =
                slots.find((s) => s.id === values.parking_slot_id)
                    ?.nightly_rate ?? 200;

            const r = await api.post('/staff/parking/checkin', {
                first_name: values.first_name,
                middle_name: values.middle_name ?? '',
                last_name: values.last_name,
                phone_number: values.phone_number,
                email: values.email ?? '',
                address: values.address ?? '',
                plate_number: values.plate_number,
                vehicle_model: values.vehicle_model,
                parking_slot_id: values.parking_slot_id,
                check_in_date: values.check_in_date.format('YYYY-MM-DD'),
                check_in_time: values.check_in_time.format('HH:mm:ss'),
                expected_checkout_date:
                    values.expected_checkout_date.format('YYYY-MM-DD'),
                expected_checkout_time:
                    values.expected_checkout_time.format('HH:mm:ss'),
                expected_nights: n,
                expected_amount: n * rate,
            });

            if (r.data.success) {
                message.success(
                    `Check-in successful! (${n} night${n !== 1 ? 's' : ''})`,
                );
                setCheckinModal(false);
                resetCheckinForm();
                onCheckInSuccess?.();
            } else {
                message.error(r.data?.message ?? 'Check-in failed.');
            }
        } catch (e: any) {
            message.error(e.response?.data?.message ?? 'Check-in failed.');
        } finally {
            setCheckingIn(false);
        }
    };

    const searchCustomers = async () => {
        if (!searchKW.trim()) {
            message.warning('Enter a keyword.');
            return;
        }
        setSearching(true);
        try {
            const r = await api.get('/customers/search', {
                params: { keyword: searchKW },
            });
            setSearchResults(Array.isArray(r.data) ? r.data : []);
        } catch {
            message.error('Search failed.');
        } finally {
            setSearching(false);
        }
    };

    const selectCustomer = (c: Customer) => {
        const currentSlotId = checkinForm.getFieldValue('parking_slot_id');
        checkinForm.setFieldsValue({
            first_name: c.first_name,
            middle_name: c.middle_name,
            last_name: c.last_name,
            phone_number: c.phone_number,
            email: c.email,
            address: c.address,
            plate_number: c.plate_number,
            vehicle_model: c.vehicle_model,
            parking_slot_id: currentSlotId,
        });
        setSearchCustModal(false);
    };

    return (
        <>
            <div
                style={{
                    width: '100%',
                    height: '650px',
                    background: '#0f172a',
                    borderRadius: 12,
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        zIndex: 10,
                    }}
                >
                    <Button
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        onClick={() => {
                            setPreselectedSlot(null);
                            setSelectedSlotId(null);
                            setBookModalVisible(true);
                        }}
                        style={{
                            background: '#10B981',
                            borderColor: '#10B981',
                            fontWeight: 600,
                            boxShadow: '0 4px 12px rgba(16,185,129,0.4)',
                            borderRadius: 8,
                            height: 40,
                        }}
                    >
                        Book a Slot
                    </Button>
                </div>

                <div
                    style={{
                        position: 'absolute',
                        bottom: 12,
                        left: 12,
                        zIndex: 10,
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(6px)',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center',
                        fontSize: 12,
                        color: '#E2E8F0',
                    }}
                >
                    <span
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                        <span
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: 2,
                                background: '#10B981',
                            }}
                        />
                        Available
                    </span>
                    <span
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                        <span
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: 2,
                                background: '#F59E0B',
                            }}
                        />
                        Occupied
                    </span>
                    <span
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                        <span
                            style={{
                                width: 10,
                                height: 10,
                                borderRadius: 2,
                                background: '#EF4444',
                            }}
                        />
                        Maintenance
                    </span>
                </div>

                <Canvas camera={{ position: [0, 16, 30], fov: 45 }} shadows>
                    <color attach="background" args={['#0f172a']} />
                    <fog attach="fog" args={['#0f172a', 45, 95]} />

                    <ambientLight intensity={0.55} />
                    <pointLight
                        position={[0, 18, 0]}
                        intensity={0.8}
                        castShadow
                    />
                    <directionalLight
                        position={[10, 18, 10]}
                        intensity={0.6}
                        castShadow
                        shadow-mapSize-width={2048}
                        shadow-mapSize-height={2048}
                    />

                    <OrbitControls
                        enablePan
                        enableZoom
                        enableRotate
                        target={[0, 0, -2]}
                        maxPolarAngle={Math.PI / 2.1}
                    />

                    <Plane
                        args={[floorWidth + 90, floorLength + 60]}
                        position={[0, -0.22, (startZ + endZ) / 2 - 5]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        receiveShadow
                    >
                        <meshStandardMaterial
                            color="#1a2e1a"
                            roughness={0.95}
                            metalness={0}
                        />
                    </Plane>

                    <Plane
                        args={[floorWidth, floorLength]}
                        position={[0, -0.15, (startZ + endZ) / 2]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        receiveShadow
                    >
                        <meshStandardMaterial
                            color="#2d2d2d"
                            roughness={0.85}
                            metalness={0.1}
                        />
                    </Plane>

                    <gridHelper
                        args={[floorWidth, 20]}
                        position={[0, -0.1, (startZ + endZ) / 2]}
                    />

                    <Plane
                        args={[walkwayWidth, floorLength - 0.5]}
                        position={[0, -0.05, (startZ + endZ) / 2]}
                        rotation={[-Math.PI / 2, 0, 0]}
                    >
                        <meshStandardMaterial
                            color="#9CA3AF"
                            roughness={0.6}
                            metalness={0.05}
                        />
                    </Plane>

                    <Box
                        args={[0.1, 0.05, floorLength - 0.5]}
                        position={[
                            -walkwayWidth / 2,
                            -0.02,
                            (startZ + endZ) / 2,
                        ]}
                    >
                        <meshStandardMaterial color="white" />
                    </Box>
                    <Box
                        args={[0.1, 0.05, floorLength - 0.5]}
                        position={[
                            walkwayWidth / 2,
                            -0.02,
                            (startZ + endZ) / 2,
                        ]}
                    >
                        <meshStandardMaterial color="white" />
                    </Box>

                    {[-7.6, -6.6].map((z) => (
                        <group key={z} position={[0, -0.03, z]}>
                            {[-0.9, -0.3, 0.3, 0.9].map((x) => (
                                <Box
                                    key={x}
                                    args={[0.35, 0.05, 0.7]}
                                    position={[x, 0, 0]}
                                >
                                    <meshStandardMaterial color="white" />
                                </Box>
                            ))}
                        </group>
                    ))}

                    <EntranceGate position={[0, 0, entranceZ]} />

                    <Plane
                        args={[roadLength, roadWidth]}
                        position={[0, -0.14, roadZ]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        receiveShadow
                    >
                        <meshStandardMaterial
                            color="#1f1f1f"
                            roughness={0.9}
                            metalness={0.05}
                        />
                    </Plane>

                    {Array.from({ length: 40 }).map((_, i) => {
                        const x = -roadLength / 2 + 1.2 + i * 2.2;
                        return (
                            <Box
                                key={`road-dash-${i}`}
                                args={[1.1, 0.02, 0.14]}
                                position={[x, -0.11, roadZ]}
                            >
                                <meshStandardMaterial
                                    color="#FCD34D"
                                    emissive="#FCD34D"
                                    emissiveIntensity={0.25}
                                />
                            </Box>
                        );
                    })}

                    <Box
                        args={[roadLength, 0.02, 0.12]}
                        position={[0, -0.11, roadZ - roadWidth / 2 + 0.2]}
                    >
                        <meshStandardMaterial color="#E5E7EB" />
                    </Box>
                    <Box
                        args={[roadLength, 0.02, 0.12]}
                        position={[0, -0.11, roadZ + roadWidth / 2 - 0.2]}
                    >
                        <meshStandardMaterial color="#E5E7EB" />
                    </Box>

                    <Plane
                        args={[roadLength, sidewalkWidth]}
                        position={[0, -0.13, sidewalkZ]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        receiveShadow
                    >
                        <meshStandardMaterial
                            color="#9CA3AF"
                            roughness={0.85}
                            metalness={0.05}
                        />
                    </Plane>

                    <Box
                        args={[roadLength, 0.18, 0.2]}
                        position={[
                            0,
                            0,
                            sidewalkZ - sidewalkWidth / 2 - 0.1,
                        ]}
                    >
                        <meshStandardMaterial
                            color="#6B7280"
                            roughness={0.7}
                        />
                    </Box>

                    <Plane
                        args={[5.0, Math.abs(sidewalkZ - gasStationZ) + 2]}
                        position={[
                            gasStationX,
                            -0.12,
                            (sidewalkZ + gasStationZ) / 2,
                        ]}
                        rotation={[-Math.PI / 2, 0, 0]}
                    >
                        <meshStandardMaterial
                            color="#2d2d2d"
                            roughness={0.85}
                            metalness={0.05}
                        />
                    </Plane>

                    <GasStation
                        position={[gasStationX, 0, gasStationZ]}
                        rotationY={Math.PI}
                    />


                    <FenceSegment
                        startX={leftFenceX}
                        startZ={frontFenceZ}
                        endX={leftFenceX}
                        endZ={backFenceZ}
                        color="#78716C"
                        height={1.0}
                    />
                    <FenceSegment
                        startX={rightFenceX}
                        startZ={frontFenceZ}
                        endX={rightFenceX}
                        endZ={backFenceZ}
                        color="#78716C"
                        height={1.0}
                    />
                    <FenceSegment
                        startX={leftFenceX}
                        startZ={backFenceZ}
                        endX={rightFenceX}
                        endZ={backFenceZ}
                        color="#78716C"
                        height={1.0}
                    />
                    <FenceSegment
                        startX={leftFenceX}
                        startZ={frontFenceZ}
                        endX={-2.3}
                        endZ={frontFenceZ}
                        color="#78716C"
                        height={1.0}
                    />
                    <FenceSegment
                        startX={2.3}
                        startZ={frontFenceZ}
                        endX={rightFenceX}
                        endZ={frontFenceZ}
                        color="#78716C"
                        height={1.0}
                    />

                    {[startZ + 1, startZ + 6, startZ + 11, startZ + 16].map(
                        (z, i) => (
                            <StreetLight
                                key={`left-light-${i}`}
                                position={[leftStartX - 1.6, 0, z]}
                                armDirection="right"
                            />
                        ),
                    )}
                    {[startZ + 1, startZ + 6, startZ + 11, startZ + 16].map(
                        (z, i) => (
                            <StreetLight
                                key={`right-light-${i}`}
                                position={[rightStartX + 1.6, 0, z]}
                                armDirection="left"
                            />
                        ),
                    )}

                    {[
                        [leftFenceX - 2.5, entranceZ + 2],
                        [leftFenceX - 3.2, entranceZ - 1],
                        [leftFenceX - 2.8, entranceZ - 4],
                        [leftFenceX - 2.4, startZ + 2],
                        [leftFenceX - 3.0, startZ + 6],
                        [leftFenceX - 2.6, startZ + 11],
                        [leftFenceX - 2.9, endZ + 3],
                        [leftFenceX - 2.2, endZ + 6],
                    ].map(([x, z], i) => (
                        <Tree
                            key={`tree-left-${i}`}
                            position={[x, 0, z]}
                            scale={0.95 + (i % 4) * 0.15}
                        />
                    ))}

                    {[
                        [rightFenceX + 2.5, startZ + 3],
                        [rightFenceX + 3.0, startZ + 8],
                        [rightFenceX + 2.6, endZ + 3],
                        [rightFenceX + 2.9, endZ + 6],
                    ].map(([x, z], i) => (
                        <Tree
                            key={`tree-right-${i}`}
                            position={[x, 0, z]}
                            scale={0.9 + (i % 4) * 0.15}
                        />
                    ))}

                    {[
                        [-9, endZ + 7],
                        [-6, endZ + 8.5],
                        [-3, endZ + 7.5],
                        [0, endZ + 8.5],
                        [3, endZ + 7.5],
                        [6, endZ + 8.5],
                        [9, endZ + 7],
                    ].map(([x, z], i) => (
                        <Tree
                            key={`tree-back-${i}`}
                            position={[x, 0, z]}
                            scale={0.9 + (i % 4) * 0.12}
                        />
                    ))}

                    {[
                        [-7, entranceZ - 2],
                        [-4.5, entranceZ - 3.5],
                        [-9, entranceZ - 5],
                        [4.5, entranceZ - 3.5],
                    ].map(([x, z], i) => (
                        <Tree
                            key={`tree-entry-${i}`}
                            position={[x, 0, z]}
                            scale={0.95}
                        />
                    ))}

                    {[
                        [gasStationX - 4.5, gasStationZ - 1],
                        [gasStationX - 5.0, gasStationZ + 2.5],
                        [gasStationX + 4.5, gasStationZ - 1.5],
                        [gasStationX + 5.0, gasStationZ + 2],
                    ].map(([x, z], i) => (
                        <Tree
                            key={`tree-gas-${i}`}
                            position={[x, 0, z]}
                            scale={0.9 + (i % 3) * 0.15}
                        />
                    ))}

                    {[
                        [-18, roadZ + roadWidth / 2 + 2.5],
                        [-12, roadZ + roadWidth / 2 + 3.5],
                        [-6, roadZ + roadWidth / 2 + 2.8],
                        [0, roadZ + roadWidth / 2 + 3.2],
                        [6, roadZ + roadWidth / 2 + 2.8],
                        [12, roadZ + roadWidth / 2 + 3.5],
                        [18, roadZ + roadWidth / 2 + 2.5],
                    ].map(([x, z], i) => (
                        <Tree
                            key={`tree-road-${i}`}
                            position={[x, 0, z]}
                            scale={0.85 + (i % 3) * 0.15}
                        />
                    ))}

                    {finalLeft.map((slot, idx) => (
                        <ParkingSlotWithRoof
                            key={slot.id}
                            slot={slot}
                            side="left"
                            position={[
                                leftStartX,
                                0,
                                startZ + idx * spacingZ,
                            ]}
                            onClick={() => handleSlotClick(slot)}
                        />
                    ))}

                    {finalRight.map((slot, idx) => (
                        <ParkingSlotWithRoof
                            key={slot.id}
                            slot={slot}
                            side="right"
                            position={[
                                rightStartX,
                                0,
                                startZ + idx * spacingZ,
                            ]}
                            onClick={() => handleSlotClick(slot)}
                        />
                    ))}

                    <Box
                        args={[0.2, 0.2, floorLength]}
                        position={[
                            leftStartX - 1.1,
                            0.1,
                            (startZ + endZ) / 2,
                        ]}
                    >
                        <meshStandardMaterial color="#6B7280" />
                    </Box>
                    <Box
                        args={[0.2, 0.2, floorLength]}
                        position={[
                            rightStartX + 1.1,
                            0.1,
                            (startZ + endZ) / 2,
                        ]}
                    >
                        <meshStandardMaterial color="#6B7280" />
                    </Box>
                </Canvas>
            </div>

            {/* PICKER MODAL */}
            <Modal
                title={
                    <Space>
                        <ThunderboltOutlined
                            style={{ color: '#10B981', fontSize: 18 }}
                        />
                        <span
                            style={{
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                            }}
                        >
                            Book a Parking Slot
                        </span>
                    </Space>
                }
                open={bookModalVisible}
                onCancel={() => {
                    setBookModalVisible(false);
                    setPreselectedSlot(null);
                    setSelectedSlotId(null);
                }}
                onOk={handleProceed}
                okText="Book now"
                okButtonProps={{
                    disabled:
                        !preselectedSlot ||
                        preselectedSlot.status !== 'available',
                    style: {
                        background: '#10B981',
                        borderColor: '#10B981',
                        fontWeight: 600,
                    },
                }}
                cancelText="Cancel"
                width={560}
                destroyOnClose
            >
                {preselectedSlot ? (
                    <>
                        <p
                            style={{
                                color: 'var(--text-secondary)',
                                marginBottom: 12,
                            }}
                        >
                            You selected{' '}
                            <strong style={{ color: 'var(--text-primary)' }}>
                                Slot {preselectedSlot.slot_number}
                            </strong>
                            . Click below to proceed to the check-in form.
                        </p>

                        <div
                            style={{
                                padding: 16,
                                background: 'var(--bg-surface-hover)',
                                borderRadius: 10,
                                border: '1px solid var(--border-color)',
                                marginBottom: 16,
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 8,
                                }}
                            >
                                <span
                                    style={{
                                        fontWeight: 700,
                                        fontSize: 18,
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    Slot {preselectedSlot.slot_number}
                                </span>
                                <Tag
                                    color="success"
                                    style={{ fontSize: 12, margin: 0 }}
                                >
                                    ✅ Available
                                </Tag>
                            </div>
                            <div
                                style={{
                                    fontSize: 13,
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                <DollarOutlined
                                    style={{ color: 'var(--success)' }}
                                />
                                Nightly Rate:{' '}
                                <strong style={{ color: 'var(--success)' }}>
                                    {fmtPHP(preselectedSlot.nightly_rate)}
                                </strong>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <p
                            style={{
                                color: 'var(--text-secondary)',
                                marginBottom: 12,
                            }}
                        >
                            Choose an available slot below to start a booking.
                        </p>

                        {bookableSlots.length === 0 ? (
                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: 24,
                                    color: 'var(--text-tertiary)',
                                }}
                            >
                                <CarOutlined
                                    style={{ fontSize: 32, marginBottom: 8 }}
                                />
                                <div>No available slots right now.</div>
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns:
                                        'repeat(auto-fill, minmax(110px, 1fr))',
                                    gap: 10,
                                    maxHeight: 320,
                                    overflowY: 'auto',
                                    padding: 4,
                                }}
                            >
                                {bookableSlots.map((s) => {
                                    const isSelected =
                                        selectedSlotId === s.id;
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => {
                                                setPreselectedSlot(s);
                                                setSelectedSlotId(s.id);
                                            }}
                                            style={{
                                                padding: '12px 8px',
                                                borderRadius: 8,
                                                border: isSelected
                                                    ? '2px solid #10B981'
                                                    : '1px solid var(--border-color)',
                                                background: isSelected
                                                    ? 'rgba(16,185,129,0.12)'
                                                    : 'var(--bg-surface-hover)',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                transition: 'all 0.15s',
                                                outline: 'none',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontWeight: 700,
                                                    fontSize: 15,
                                                    color: isSelected
                                                        ? '#10B981'
                                                        : 'var(--text-primary)',
                                                    marginBottom: 4,
                                                }}
                                            >
                                                {s.slot_number}
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    color: 'var(--text-secondary)',
                                                }}
                                            >
                                                {fmtPHP(s.nightly_rate)}/night
                                            </div>
                                            {isSelected && (
                                                <CheckCircleOutlined
                                                    style={{
                                                        color: '#10B981',
                                                        fontSize: 14,
                                                        marginTop: 4,
                                                    }}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </Modal>

            {/* CHECK-IN MODAL */}
            <Modal
                title={
                    <span
                        style={{
                            color: 'var(--text-primary)',
                            fontWeight: 600,
                        }}
                    >
                        {prefillSlot
                            ? `Check In — Slot ${prefillSlot.slot_number}`
                            : 'Walk-in Check In'}
                    </span>
                }
                open={checkinModal}
                onCancel={() => {
                    setCheckinModal(false);
                    resetCheckinForm();
                }}
                footer={null}
                width={640}
                destroyOnClose
                style={{ background: 'var(--bg-card)' }}
            >
                {prefillSlot && (
                    <Alert
                        message={`Selected slot: ${prefillSlot.slot_number} — ${fmtPHP(prefillSlot.nightly_rate)}/night`}
                        type="success"
                        showIcon
                        icon={<CheckCircleOutlined />}
                        style={{ marginBottom: 16 }}
                        action={
                            <Button
                                size="small"
                                onClick={() => setSearchCustModal(true)}
                            >
                                Search Existing
                            </Button>
                        }
                    />
                )}

                <Form
                    form={checkinForm}
                    layout="vertical"
                    onFinish={handleCheckin}
                    initialValues={{
                        check_in_date: dayjs(),
                        check_in_time: dayjs('14:00', 'HH:mm'),
                        expected_checkout_date: dayjs().add(1, 'day'),
                        expected_checkout_time: dayjs('12:00', 'HH:mm'),
                    }}
                >
                    <Row gutter={12}>
                        <Col span={8}>
                            <Form.Item
                                name="first_name"
                                label="First Name"
                                rules={[{ required: true }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="middle_name" label="Middle Name">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="last_name"
                                label="Last Name"
                                rules={[{ required: true }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item
                                name="phone_number"
                                label="Phone"
                                rules={[{ required: true }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="email" label="Email">
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="address" label="Address">
                        <Input />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item
                                name="vehicle_model"
                                label="Vehicle Model"
                                rules={[{ required: true }]}
                            >
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="plate_number"
                                label="Plate Number"
                                rules={[{ required: true }]}
                            >
                                <Input
                                    style={{ textTransform: 'uppercase' }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item
                        name="parking_slot_id"
                        label="Parking Slot"
                        rules={[{ required: true }]}
                    >
                        <Select placeholder="Select available slot">
                            {availSlots.map((s) => (
                                <Option key={s.id} value={s.id}>
                                    {s.slot_number} — {fmtPHP(s.nightly_rate)}
                                    /night
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item
                                name="check_in_date"
                                label="Check-in Date"
                                rules={[{ required: true }]}
                            >
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="check_in_time"
                                label="Check-in Time"
                                rules={[{ required: true }]}
                            >
                                <TimePicker
                                    style={{ width: '100%' }}
                                    format="HH:mm"
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item
                                name="expected_checkout_date"
                                label="Expected Check-out Date"
                                rules={[{ required: true }]}
                            >
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="expected_checkout_time"
                                label="Expected Check-out Time"
                                rules={[{ required: true }]}
                            >
                                <TimePicker
                                    style={{ width: '100%' }}
                                    format="HH:mm"
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 8,
                            marginTop: 8,
                        }}
                    >
                        <Button
                            onClick={() => {
                                setCheckinModal(false);
                                resetCheckinForm();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={checkingIn}
                            icon={<LoginOutlined />}
                            style={{
                                background: '#10B981',
                                borderColor: '#10B981',
                                fontWeight: 600,
                            }}
                        >
                            Confirm Check In
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* CUSTOMER SEARCH MODAL */}
            <Modal
                title={
                    <Space>
                        <UserOutlined style={{ color: '#10B981' }} />
                        <span
                            style={{
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                            }}
                        >
                            Search Customer
                        </span>
                    </Space>
                }
                open={searchCustModal}
                onCancel={() => {
                    setSearchCustModal(false);
                    setSearchKW('');
                    setSearchResults([]);
                }}
                footer={null}
                width={560}
                destroyOnClose
            >
                <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
                    <Input
                        placeholder="Name, phone, or email…"
                        value={searchKW}
                        onChange={(e) => setSearchKW(e.target.value)}
                        onPressEnter={searchCustomers}
                    />
                    <Button
                        type="primary"
                        loading={searching}
                        onClick={searchCustomers}
                    >
                        Search
                    </Button>
                </Space.Compact>

                {searchResults.length > 0 && (
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                        {searchResults.map((c) => (
                            <div
                                key={c.id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 12px',
                                    marginBottom: 6,
                                    borderRadius: 8,
                                    background: 'var(--bg-surface-hover)',
                                    border: '1px solid var(--border-color)',
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        {c.first_name} {c.last_name}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        {c.phone_number}
                                        {c.email ? ` · ${c.email}` : ''}
                                    </div>
                                </div>
                                <Button
                                    type="primary"
                                    size="small"
                                    onClick={() => selectCustomer(c)}
                                >
                                    Use
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {searchResults.length === 0 && searchKW && !searching && (
                    <div
                        style={{
                            textAlign: 'center',
                            color: 'var(--text-tertiary)',
                            padding: 16,
                        }}
                    >
                        No customers found.
                    </div>
                )}
            </Modal>
        </>
    );
};