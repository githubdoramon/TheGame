import { Box, Grid, Heading, Image, keyframes, Link, Text } from '@metafam/ds';
import QuestEngaged from 'assets/quests/quest-engaged.svg';
import QuestGeneral from 'assets/quests/quest-general.svg';
import QuestInitiation from 'assets/quests/quest-initiation.svg';
import { PageContainer } from 'components/Container';
import { HeadComponent } from 'components/Seo';
import React from 'react';

const questCategories = [
  {
    title: 'Initiation',
    description: 'Understand the MetaGame',
    link: '/quests/initiation',
    Icon: QuestInitiation,
    progress: 86,
    color: '#e2e3a1',
  },
  {
    title: 'Path of the Engaged',
    description: 'Carve your path and become a Player',
    link: '/quests/role',
    Icon: QuestEngaged,
    progress: 4,
    color: '#AB7C94',
  },
  {
    title: 'General',
    description: 'Quests for all!',
    link: '/quests/general',
    Icon: QuestGeneral,
    completed: 24,
    color: '#8aade6',
  },
];

const QuestsDashboard: React.FC = () => (
  <PageContainer>
    <HeadComponent
      title="MetaGame Quests"
      description="MetaGame is a Massive Online Coordination Game! MetaGame has some epic quests going on!"
      url="https://my.metagame.wtf/quests"
    />
    <Heading mb={8}>Quests</Heading>
    <Grid templateColumns={['auto', 'auto', '1fr 1fr', '1fr 1fr 1fr']} gap={6}>
      {questCategories.map(
        ({ title, description, link, Icon, progress, completed, color }) => (
          <Card
            key={title}
            {...{ title, description, link, Icon, progress, completed, color }}
          />
        ),
      )}
    </Grid>
  </PageContainer>
);

type CardProps = {
  title: string;
  description: string;
  link: string;
  Icon: string;
  progress?: number;
  completed?: number;
  color: string;
};

const Card: React.FC<CardProps> = ({
  title,
  description,
  link,
  Icon,
  progress,
  completed,
  color,
}) => {
  const spin = keyframes`
    from { width: 0; }
    to { width: ${progress}%; }
  `;

  return (
    <Link
      display="flex"
      direction="column"
      borderRadius="lg"
      borderWidth="1px"
      textColor="white"
      alignItems="center"
      textAlign="center"
      placeContent="center"
      p={8}
      m={2}
      maxW="sm"
      minH="3xs"
      w={['full', 'auto']}
      cursor="pointer"
      href={link}
      sx={{
        bgColor: '#110035',
        borderColor: 'whiteAlpha.400',
        transition: 'all 0.1s ease-in-out',
        _hover: { bgColor: '#150042', borderColor: 'whiteAlpha.700' },
      }}
    >
      <Box borderTopRadius="lg">
        {completed && (
          <Box>
            <Text fontFamily="heading" textColor={color}>
              Completed: {completed}
            </Text>
          </Box>
        )}
        {progress && (
          <Box
            background="rgba(255,255,255,0.1)"
            justifyContent="flex-start"
            borderRadius="100px"
            alignItems="center"
            position="relative"
            padding="0 5px"
            display="flex"
            height={8}
          >
            <Box
              animation={`${spin} 3s normal forwards`}
              boxShadow="0 10px 40px -10px #fff"
              borderRadius="100px"
              background={color}
              height={6}
              width="0"
            ></Box>
          </Box>
        )}
        <Text fontSize="xl" fontWeight="bold" mt={1} my={4}>
          {title.toUpperCase()}
        </Text>
        <Box p={12}>
          <Image src={Icon} fill="white" />
        </Box>
        <Text mb={2}>{description}</Text>
      </Box>
    </Link>
  );
};

export default QuestsDashboard;
